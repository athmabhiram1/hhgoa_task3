import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function collectSource(dir) {
  let src = '';
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) src += collectSource(full);
    else if (/\.(tsx|ts)$/.test(entry.name)) src += fs.readFileSync(full, 'utf8') + '\n';
  }
  return src;
}

const src = collectSource('app');

test('Page shows the configured provider explicitly', () => {
  assert.match(src, /provider-chip/, 'Page must render a provider chip');
  assert.match(src, /NO PROVIDER/, 'Page must show an explicit empty provider state');
});

test('Page surfaces search_id in the discovery board', () => {
  assert.match(src, /SEARCH ID/, 'Page must label the search identifier');
  assert.match(src, /setSearchId\(nextSearchId\)/, 'Page must store the provider search identifier');
});

test('Page keeps an honest empty-state for zero matches', () => {
  assert.match(src, /No source cards yet\./, 'Page must render a clear empty board');
  assert.match(src, /nothing was invented/, 'Page must make the empty-state limitation explicit');
});

test('Page clears prior candidates before a new live search', () => {
  assert.match(src, /setCandidates\(\[\]\)/, 'Page must clear stale source cards before searching');
});

test('Page has a source board state for live results', () => {
  assert.match(src, /source-list/, 'Page must render a dedicated source list');
  assert.match(src, /setCandidates\(nextCandidates\)/, 'Page must populate the board from provider results');
});
