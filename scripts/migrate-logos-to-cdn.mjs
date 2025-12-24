/**
 * Migration script to move existing organization logos to S3/CDN
 *
 * Usage:
 *   ENV=dev node scripts/migrate-logos-to-cdn.mjs
 *   ENV=sandbox node scripts/migrate-logos-to-cdn.mjs
 *   ENV=prod node scripts/migrate-logos-to-cdn.mjs
 *
 * Requires: AWS credentials for platform account (992382507453) which assumes into target account
 */

import {
  RDSDataClient,
  ExecuteStatementCommand,
} from '@aws-sdk/client-rds-data';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import https from 'https';
import http from 'http';

// Environment configuration
const ENV = process.env.ENV || 'dev';

const CONFIG = {
  sandbox: {
    roleArn: 'arn:aws:iam::423623857147:role/cicd',
    s3Bucket: 'carousel-organization-assets-sandbox',
    cdnDomain: 'cdn.sandbox.carousel.gg',
  },
  dev: {
    roleArn: 'arn:aws:iam::891376939351:role/cicd',
    s3Bucket: 'carousel-organization-assets-dev',
    cdnDomain: 'cdn.dev.carousel.gg',
  },
  prod: {
    roleArn: 'arn:aws:iam::905418365150:role/cicd',
    s3Bucket: 'carousel-organization-assets-prod',
    cdnDomain: 'cdn.carousel.gg',
  },
};

if (!CONFIG[ENV]) {
  console.error(`Invalid ENV: ${ENV}. Must be one of: sandbox, dev, prod`);
  process.exit(1);
}

const { roleArn, s3Bucket, cdnDomain } = CONFIG[ENV];

// Assume role and get credentials
async function getAssumedCredentials() {
  console.log(`Assuming role: ${roleArn}`);
  const stsClient = new STSClient({ region: 'us-west-2' });

  const response = await stsClient.send(
    new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: 'logo-migration-script',
      DurationSeconds: 3600,
    })
  );

  return {
    accessKeyId: response.Credentials.AccessKeyId,
    secretAccessKey: response.Credentials.SecretAccessKey,
    sessionToken: response.Credentials.SessionToken,
  };
}

// Get SSM parameter value
async function getSSMParameter(ssmClient, name) {
  const response = await ssmClient.send(
    new GetParameterCommand({ Name: name })
  );
  return response.Parameter.Value;
}

// Download image from URL and return as Buffer
async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    client.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadImage(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const contentType = response.headers['content-type'] || 'image/png';
        resolve({ buffer, contentType });
      });
      response.on('error', reject);
    }).on('error', reject);
  });
}

// Get file extension from content type
function getExtensionFromContentType(contentType) {
  const extensions = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
  };
  const baseType = contentType.split(';')[0].trim();
  return extensions[baseType] || 'png';
}

// Upload image to S3 and return CDN URL
async function uploadToS3(s3Client, buffer, contentType, organizationId, logoType) {
  const extension = getExtensionFromContentType(contentType);
  const key = `organizations/${organizationId}/logo-${logoType}.${extension}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return `https://${cdnDomain}/${key}`;
}

// Check if URL is already a CDN URL
function isAlreadyCdnUrl(url) {
  return url.includes(cdnDomain) || url.includes('carousel-organization-assets');
}

// Fetch all brands with their organization IDs
async function fetchBrands(rdsClient, dbClusterArn, dbSecretArn, dbName) {
  const result = await rdsClient.send(
    new ExecuteStatementCommand({
      resourceArn: dbClusterArn,
      secretArn: dbSecretArn,
      database: dbName,
      sql: `
        SELECT
          b.id as brand_id,
          o.id as organization_id,
          b.logo_full_src,
          b.logo_mobile_src
        FROM brands b
        INNER JOIN organizations o ON o.brand_id = b.id
        WHERE b.logo_full_src IS NOT NULL
           OR b.logo_mobile_src IS NOT NULL
      `,
    }),
  );

  if (!result.records) {
    return [];
  }

  return result.records.map((record) => ({
    brandId: record[0].stringValue,
    organizationId: record[1].stringValue,
    logoFullSrc: record[2].stringValue || null,
    logoMobileSrc: record[3].stringValue || null,
  }));
}

// Update brand with new CDN URLs
async function updateBrand(rdsClient, dbClusterArn, dbSecretArn, dbName, brandId, logoFullSrc, logoMobileSrc) {
  const updates = [];
  const parameters = [
    { name: 'brandId', value: { stringValue: brandId } },
  ];

  if (logoFullSrc) {
    updates.push('logo_full_src = :logoFullSrc');
    parameters.push({ name: 'logoFullSrc', value: { stringValue: logoFullSrc } });
  }

  if (logoMobileSrc) {
    updates.push('logo_mobile_src = :logoMobileSrc');
    parameters.push({ name: 'logoMobileSrc', value: { stringValue: logoMobileSrc } });
  }

  if (updates.length === 0) {
    return;
  }

  await rdsClient.send(
    new ExecuteStatementCommand({
      resourceArn: dbClusterArn,
      secretArn: dbSecretArn,
      database: dbName,
      sql: `UPDATE brands SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = :brandId::uuid`,
      parameters,
    }),
  );
}

// Main migration function
async function migrate() {
  console.log(`\n========================================`);
  console.log(`Logo Migration to CDN - ${ENV.toUpperCase()}`);
  console.log(`========================================\n`);

  // Get assumed role credentials
  const credentials = await getAssumedCredentials();
  console.log('Successfully assumed role\n');

  // Create clients with assumed credentials
  const clientConfig = { region: 'us-west-2', credentials };
  const ssmClient = new SSMClient(clientConfig);
  const rdsClient = new RDSDataClient(clientConfig);
  const s3Client = new S3Client(clientConfig);

  // Get database configuration from SSM
  console.log('Fetching database configuration from SSM...');
  const dbClusterArn = await getSSMParameter(ssmClient, `/carousel/database/${ENV}/cluster-arn`);
  const dbSecretArn = await getSSMParameter(ssmClient, `/carousel/database/${ENV}/secret-arn`);
  const dbName = await getSSMParameter(ssmClient, `/carousel/database/${ENV}/database-name`);

  console.log('Configuration:');
  console.log(`  Environment: ${ENV}`);
  console.log(`  S3 Bucket: ${s3Bucket}`);
  console.log(`  CDN Domain: ${cdnDomain}`);
  console.log(`  Database: ${dbName}\n`);

  // Fetch all brands
  console.log('Fetching brands from database...');
  const brands = await fetchBrands(rdsClient, dbClusterArn, dbSecretArn, dbName);
  console.log(`Found ${brands.length} brands to process\n`);

  if (brands.length === 0) {
    console.log('No brands to migrate. Done!');
    return;
  }

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const brand of brands) {
    console.log(`Processing organization ${brand.organizationId}...`);

    let newLogoFullSrc = null;
    let newLogoMobileSrc = null;

    // Process full logo
    if (brand.logoFullSrc) {
      if (isAlreadyCdnUrl(brand.logoFullSrc)) {
        console.log(`  Full logo: Already on CDN, skipping`);
        skipCount++;
      } else {
        try {
          console.log(`  Full logo: Downloading from ${brand.logoFullSrc}`);
          const { buffer, contentType } = await downloadImage(brand.logoFullSrc);
          console.log(`  Full logo: Uploading to S3 (${contentType}, ${buffer.length} bytes)`);
          newLogoFullSrc = await uploadToS3(s3Client, buffer, contentType, brand.organizationId, 'full');
          console.log(`  Full logo: Uploaded to ${newLogoFullSrc}`);
        } catch (error) {
          console.error(`  Full logo: Error - ${error.message || error}`);
          errorCount++;
        }
      }
    }

    // Process mobile logo
    if (brand.logoMobileSrc) {
      if (isAlreadyCdnUrl(brand.logoMobileSrc)) {
        console.log(`  Mobile logo: Already on CDN, skipping`);
        skipCount++;
      } else {
        try {
          console.log(`  Mobile logo: Downloading from ${brand.logoMobileSrc}`);
          const { buffer, contentType } = await downloadImage(brand.logoMobileSrc);
          console.log(`  Mobile logo: Uploading to S3 (${contentType}, ${buffer.length} bytes)`);
          newLogoMobileSrc = await uploadToS3(s3Client, buffer, contentType, brand.organizationId, 'mobile');
          console.log(`  Mobile logo: Uploaded to ${newLogoMobileSrc}`);
        } catch (error) {
          console.error(`  Mobile logo: Error - ${error.message || error}`);
          errorCount++;
        }
      }
    }

    // Update database if we have new URLs
    if (newLogoFullSrc || newLogoMobileSrc) {
      try {
        await updateBrand(rdsClient, dbClusterArn, dbSecretArn, dbName, brand.brandId, newLogoFullSrc, newLogoMobileSrc);
        console.log(`  Database: Updated brand ${brand.brandId}`);
        successCount++;
      } catch (error) {
        console.error(`  Database: Error updating - ${error.message || error}`);
        errorCount++;
      }
    }

    console.log('');
  }

  console.log('========================================');
  console.log('Migration complete!');
  console.log(`  Successful: ${successCount}`);
  console.log(`  Skipped (already on CDN): ${skipCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log('========================================\n');
}

// Run migration
migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
