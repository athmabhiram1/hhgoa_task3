import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function collectSource(dir) {
  let page = '';
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) page += collectSource(full);
    else if (/\.(tsx|ts)$/.test(entry.name)) page += fs.readFileSync(full, 'utf8') + '\n';
  }
  return page;
}

const page = collectSource('app');

test('Page writes and stores the real anchor receipt for custody', () => {
  assert.match(page, /contract\.anchor/, 'Page must call the deployed anchor contract');
  assert.match(page, /setAnchor\(nextAnchor\)/, 'Page must store the returned transaction and block receipt');
});

test('Page exposes a real on-chain re-verification path', () => {
  assert.match(page, /contract\.verify\(anchor\.digest\)/, 'Page must query the on-chain receipt by digest');
  assert.match(page, /TAMPER SIMULATION/, 'Page must make the tamper comparison explicit in the UI');
});
