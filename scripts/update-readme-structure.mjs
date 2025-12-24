#!/usr/bin/env node

import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

const ROOT_DIR = process.cwd();
const README_PATH = join(ROOT_DIR, 'README.md');

// Directories and files to ignore
const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.husky',
  'dist',
  'coverage',
  '.DS_Store',
  '*.zip',
  'pnpm-lock.yaml',
  '.terraform',
  '.terraform.lock.hcl',
  'terraform.tfstate*',
];

// Markers in README for auto-generated content
const START_MARKER = '<!-- FOLDER_STRUCTURE_START -->';
const END_MARKER = '<!-- FOLDER_STRUCTURE_END -->';

function shouldIgnore(name) {
  return IGNORE_PATTERNS.some((pattern) => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      return regex.test(name);
    }
    return name === pattern;
  });
}

function generateTree(dir, prefix = '', isLast = true, isRoot = true) {
  const entries = [];
  const name = isRoot ? '.' : dir.split('/').pop();

  if (!isRoot) {
    const connector = isLast ? '└── ' : '├── ';
    entries.push(prefix + connector + name + '/');
  }

  let items;
  try {
    items = readdirSync(dir)
      .filter((item) => !shouldIgnore(item))
      .sort((a, b) => {
        const aIsDir = statSync(join(dir, a)).isDirectory();
        const bIsDir = statSync(join(dir, b)).isDirectory();
        // Directories first, then files
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.localeCompare(b);
      });
  } catch {
    return entries;
  }

  const newPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');

  items.forEach((item, index) => {
    const itemPath = join(dir, item);
    const isDirectory = statSync(itemPath).isDirectory();
    const isLastItem = index === items.length - 1;
    const connector = isLastItem ? '└── ' : '├── ';

    if (isDirectory) {
      const subEntries = generateTree(itemPath, newPrefix, isLastItem, false);
      entries.push(...subEntries);
    } else {
      entries.push(newPrefix + connector + item);
    }
  });

  return entries;
}

function updateReadme() {
  const tree = generateTree(ROOT_DIR);
  const treeContent = tree.join('\n');

  const newStructureSection = `${START_MARKER}
\`\`\`text
${treeContent}
\`\`\`
${END_MARKER}`;

  let readme = readFileSync(README_PATH, 'utf-8');

  const startIndex = readme.indexOf(START_MARKER);
  const endIndex = readme.indexOf(END_MARKER);

  if (startIndex === -1 || endIndex === -1) {
    console.log(
      'Markers not found in README.md. Please add the following markers:',
    );
    console.log(START_MARKER);
    console.log(END_MARKER);
    process.exit(1);
  }

  const before = readme.substring(0, startIndex);
  const after = readme.substring(endIndex + END_MARKER.length);

  const newReadme = before + newStructureSection + after;

  if (newReadme !== readme) {
    writeFileSync(README_PATH, newReadme);
    console.log('README.md updated with current folder structure');
    return true;
  }

  console.log('README.md folder structure is already up to date');
  return false;
}

updateReadme();
