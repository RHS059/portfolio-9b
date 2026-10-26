import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../next.config.mjs';

test('Fleet Console proxies the clean URL and all nested assets to its portfolio build', async () => {
  const rewrites = await config.rewrites();
  assert.equal(rewrites.find(r => r.source === '/apps/fleet-management').destination,
    'https://rhs059.github.io/fleet_manager/portfolio/index.html');
  assert.equal(rewrites.find(r => r.source === '/apps/fleet-management/:path+').destination,
    'https://rhs059.github.io/fleet_manager/portfolio/:path+');
  assert.ok(rewrites.some(r => r.source === '/enfusion_field_kit_beta'));
});
