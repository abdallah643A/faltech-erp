#!/usr/bin/env node
/**
 * CI Validation Pipeline
 * -----------------------
 * Runs three guards before deployment:
 *   1. Missing-module detection — every `import 'pkg'` resolves in node_modules.
 *   2. Route integrity — every <Route path="..."> referenced from the sidebar exists.
 *   3. Production build — `vite build` completes successfully.
 *
 * Usage:  node scripts/ci-validate.mjs [--skip-build]
 * Exits non-zero on any failure so CI can block the deploy.
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC  = join(ROOT, 'src');
const args = new Set(process.argv.slice(2));
const errors = [];
const warn   = [];

const log = (msg) => console.log(`\x1b[36m[ci-validate]\x1b[0m ${msg}`);
const ok  = (msg) => console.log(`\x1b[32m  ✓\x1b[0m ${msg}`);
const bad = (msg) => { console.log(`\x1b[31m  ✗\x1b[0m ${msg}`); errors.push(msg); };

/* ---------- 1. Missing-module detection ---------- */
log('Scanning bare imports against installed dependencies…');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const declared = new Set([
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
]);

const importRe = /from\s+['"]([^'".][^'"]*)['"]|import\s+['"]([^'".][^'"]*)['"]/g;
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

const sourceFiles = walk(SRC).filter((f) => /\.(t|j)sx?$/.test(f));
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
const seen = new Set();
for (const file of sourceFiles) {
  const txt = stripComments(readFileSync(file, 'utf8'));
  for (const m of txt.matchAll(importRe)) {
    const spec = m[1] ?? m[2];
    if (!spec || spec.startsWith('@/') || spec.startsWith('.')) continue;
    const root = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
    if (seen.has(root)) continue;
    seen.add(root);
    if (declared.has(root)) continue;
    if (['react', 'react-dom'].includes(root)) continue;
    if (!existsSync(join(ROOT, 'node_modules', root, 'package.json'))) {
      bad(`Import "${root}" used in ${file.replace(ROOT + '/', '')} is not in package.json and not installed`);
    } else {
      warn.push(`Import "${root}" not declared in package.json (resolved via hoisting)`);
    }
  }
}
ok(`Scanned ${sourceFiles.length} files, ${seen.size} unique packages`);

/* ---------- 2. Route integrity ---------- */
log('Cross-checking sidebar links against App.tsx routes…');
const app = readFileSync(join(SRC, 'App.tsx'), 'utf8');
const definedRoutes = new Set(
  [...app.matchAll(/<Route\s+path=['"]([^'"]+)['"]/g)].map((m) => m[1])
);
const sidebarSrc = existsSync(join(SRC, 'components/layout/Sidebar.tsx'))
  ? readFileSync(join(SRC, 'components/layout/Sidebar.tsx'), 'utf8')
  : '';
// Sidebar entries use { href: '/path' } | { path: '/path' } | { to: '/path' }
const sidebarPaths = [
  ...sidebarSrc.matchAll(/(?:href|path|to):\s*['"](\/[^'"#?]*)['"]/g),
].map((m) => m[1]);
let missing = 0;
for (const p of sidebarPaths) {
  // Strip dynamic params from sidebar (rare) and ignore external links
  const norm = p.split('?')[0];
  const matches = [...definedRoutes].some((rp) => {
    if (rp === norm || rp === '*') return true;
    // Treat parameterised routes as matching their static prefix
    const re = new RegExp('^' + rp.replace(/:[^/]+/g, '[^/]+') + '$');
    return re.test(norm);
  });
  if (!matches) { bad(`Sidebar path "${norm}" has no matching <Route>`); missing++; }
}
ok(`Validated ${sidebarPaths.length} sidebar paths against ${definedRoutes.size} routes (${missing} missing)`);

/* ---------- 3. Production build ---------- */
if (!args.has('--skip-build')) {
  log('Running `vite build`…');
  try {
    execSync('npx vite build --logLevel warn', { cwd: ROOT, stdio: 'inherit' });
    ok('Production build succeeded');
  } catch {
    bad('Production build failed — see output above');
  }
} else {
  log('Skipping build (--skip-build)');
}

/* ---------- Summary ---------- */
console.log('');
if (warn.length) console.log(`\x1b[33m${warn.length} warnings\x1b[0m (non-blocking)`);
if (errors.length) {
  console.log(`\x1b[31m${errors.length} errors — blocking deploy\x1b[0m`);
  process.exit(1);
}
console.log('\x1b[32mAll CI validations passed.\x1b[0m');
