import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (name) => readFile(join(root, name), 'utf8');

async function walk(directory) {
  const result = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'coverage'].includes(item.name)) continue;
    const path = join(directory, item.name);
    if (item.isDirectory()) result.push(...await walk(path));
    else result.push(path);
  }
  return result;
}

test('Repository metadata, license and lockfile stay consistent and dependency-free', async () => {
  const metadata = JSON.parse(await read('package.json'));
  const lockfile = JSON.parse(await read('package-lock.json'));
  assert.equal(metadata.name, 'mac-tv-mirror');
  assert.equal(metadata.license, 'MIT');
  assert.equal(metadata.private, true);
  assert.equal(lockfile.name, metadata.name);
  assert.equal(lockfile.version, metadata.version);
  assert.equal(lockfile.packages[''].license, metadata.license);
  assert.equal(lockfile.packages[''].engines.node, metadata.engines.node);
  assert.deepEqual(Object.keys(metadata.dependencies || {}), []);
  assert.deepEqual(Object.keys(metadata.devDependencies || {}), []);
  assert.deepEqual(Object.keys(lockfile.packages), ['']);
  assert.match(await read('LICENSE'), /MIT License/);
  for (const path of ['README.md', 'README.tr.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CODE_OF_CONDUCT.md', 'CHANGELOG.md', 'docs/PUBLISHING.md', '.github/workflows/ci.yml', '.gitignore']) {
    assert.equal((await stat(join(root, path))).isFile(), true, path);
  }
});

test('Local Markdown links resolve and documents contain no absolute home paths', async () => {
  const documents = (await walk(root)).filter((path) => extname(path) === '.md');
  for (const document of documents) {
    const content = await readFile(document, 'utf8');
    assert.doesNotMatch(content, /\/(?:Users|home)\/[^\s<>`]+/, document);
    for (const match of content.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)) {
      const target = match[1];
      if (/^(?:https?:|mailto:|#)/i.test(target)) continue;
      const path = decodeURIComponent(target.split('#')[0]);
      await assert.doesNotReject(stat(resolve(dirname(document), path)), `${document}: ${target}`);
    }
  }
});

test('Language switching updates current messages without reloading or losing the TV URL', async () => {
  const createElement = (text) => ({ textContent: text, value: '', getAttribute: () => '' });
  const elements = {
    heading: createElement('Mirror your Mac to your TV'),
    status: createElement('Connecting to the local server…'),
    'tv-url': createElement('Preparing address…'),
    language: createElement(''),
  };
  const storage = new Map();
  const context = {
    window: { location: { href: 'http://localhost:8765/mac?lang=tr' } },
    document: {
      documentElement: { lang: 'en' },
      getElementById: (id) => elements[id],
      querySelectorAll: () => [elements.heading, elements.status, elements['tv-url']],
    },
    URL, navigator: { language: 'en-US' },
    localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
  };
  runInNewContext(await read('public/i18n.js'), context);
  const ui = context.window.MirrorI18n;
  assert.equal(context.document.documentElement.lang, 'tr');
  assert.equal(elements.heading.textContent, 'Mac ekranını TV’ye yansıt');
  assert.equal(ui.t('Incorrect pairing code.'), 'Eşleştirme kodu yanlış.');
  ui.set('status', 'TV paired ✓');
  ui.set('tv-url', 'http://192.0.2.10:8765/');
  elements.language.value = 'en';
  elements.language.onchange();
  assert.equal(elements.status.textContent, 'TV paired ✓');
  assert.equal(elements['tv-url'].textContent, 'http://192.0.2.10:8765/');
  assert.equal(elements.heading.textContent, 'Mirror your Mac to your TV');
  assert.deepEqual([...storage.keys()], ['mac-tv-mirror-language']);
});
