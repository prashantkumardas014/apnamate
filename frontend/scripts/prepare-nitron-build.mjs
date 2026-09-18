import { cpSync, rmSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = process.cwd();
const dist = resolve(root, 'dist');

// Backup original source index.html if not already backed up
if (!existsSync(resolve(root, 'index.source.html'))) {
  cpSync(resolve(root, 'index.html'), resolve(root, 'index.source.html'));
}

// Copy built files to root
cpSync(resolve(dist, 'index.html'), resolve(root, 'index.html'));

if (existsSync(resolve(root, 'assets'))) {
  rmSync(resolve(root, 'assets'), {
    recursive: true,
    force: true,
  });
}

if (existsSync(resolve(dist, 'assets'))) {
  cpSync(
    resolve(dist, 'assets'),
    resolve(root, 'assets'),
    { recursive: true }
  );
}

// Copy any static files at dist root
['favicon.svg', 'logo.svg'].forEach((file) => {
  const src = resolve(dist, file);
  if (existsSync(src)) {
    cpSync(src, resolve(root, file));
  }
});

console.log('? Prepared root for Nitron build');
