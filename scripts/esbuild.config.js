import { build } from 'esbuild';
import * as glob from 'glob';

console.log('Building services...');

const outDir = './dist/services';

const fileSources = [
  {
    files: glob.sync('./src/services/**/*.handler.ts'),
  },
];

const main = () => {
  fileSources.forEach((source) => {
    source.files.forEach((file) => {
      const directoryName = file.split('/').pop().replace('.handler.ts', '');
      const fileName = file.split('/').pop().replace('.ts', '');

      console.log('Building Service:', directoryName);

      build({
        entryPoints: [file],
        bundle: true,
        outfile: `${outDir}/${directoryName}/${fileName}.js`,
        platform: 'node',
        target: 'node22',
        external: ['@aws-sdk/*', 'aws-lambda'],
        minify: true,
      }).catch(() => {
        console.error('Failed to build file:', file);
        process.exit(1);
      });
    });
  });

  console.log('Services built successfully!');
};

main();
