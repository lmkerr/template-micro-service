import * as path from 'path';
import * as glob from 'glob';
import * as fs from 'fs';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = path.join(__dirname, '../dist/services'); // Adjusted to account for the scripts folder being in the root

// Function to create a zip archive
const zipFile = async (filePath, outputFilePath) => {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);

    // Add the file to the archive, renaming it without the `.handler.js` suffix
    const renamedFileName = path
      .basename(filePath)
      .replace('.handler.js', '.js');

    archive.file(filePath, { name: renamedFileName });

    archive.finalize();
  });
};

const processFiles = async () => {
  try {
    console.log('Starting zipping process...');

    // Use glob to find all .handler.js files
    const files = glob.sync(`${baseDir}/**/*.handler.js`);

    for (const file of files) {
      const serviceName = file.split('/').slice(-2)[0];
      console.log(`Zipping Service: ${serviceName}`);

      const zipFilePath = file.replace('.handler.js', '.zip');
      await zipFile(file, zipFilePath);
    }

    console.log('Zipping process completed!');
  } catch (error) {
    console.error('Error during zipping process:', error);
  }
};

processFiles();
