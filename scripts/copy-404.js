// GitHub Pages has no server-side routing — it only serves real files.
// When someone loads /finance-tracker/loans directly (or refreshes on it),
// GitHub looks for a literal `loans` file, doesn't find one, and serves its
// own 404 page before React Router ever gets a chance to run.
//
// The standard fix: also serve the SPA's index.html content AS 404.html.
// GitHub Pages falls back to 404.html for any unmatched path, which loads
// the app shell, and React Router then reads the URL and renders the right
// page client-side.
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(process.cwd(), 'dist');
const src = join(dist, 'index.html');
const dest = join(dist, '404.html');

if (!existsSync(src)) {
  console.error('dist/index.html not found — did the build run first?');
  process.exit(1);
}

copyFileSync(src, dest);
console.log('Copied dist/index.html -> dist/404.html for GitHub Pages SPA fallback.');
