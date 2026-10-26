import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } from 'jose';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createGateway, TOOL_NAMES } from '../src/bridge.mjs';
import { readConfig } from '../src/config.mjs';
import { createApp, tokenVerifier } from '../src/app.mjs';

function fake(call = async () => ({ content: [{ type: 'text', text: '{"sessions":12}' }] })) {
  return { listTools: async () => ({ tools: TOOL_NAMES.map(name => ({ name, inputSchema: { type: 'object', properties: {} } })) }), callTool: call };
}
const env = { CLARITY_API_TOKEN: 'test-only-secret', MCP_RESOURCE_URL: 'https://mcp.example.com/mcp', OAUTH_ISSUER: 'https://id.example.com', OAUTH_JWKS_URL: 'https://id.example.com/keys', OAUTH_ALLOWED_SUBJECTS: 'owner' };

test('fails closed on missing secrets, owner, insecure resource and bad port', () => {
  for (const patch of [{ CLARITY_API_TOKEN: '' }, { OAUTH_ALLOWED_SUBJECTS: '' }, { MCP_RESOURCE_URL: 'http://example.com/mcp' }, { PORT: 'NaN' }]) assert.throws(() => readConfig({ ...env, ...patch }));
  assert.equal(readConfig(env).issuer, env.OAUTH_ISSUER);
});
test('cache coalesces requests and expires; failures are not cached', async () => {
  let calls = 0, time = 1_000_000;
  const gateway = await createGateway(fake(async () => { calls++; await new Promise(r => setTimeout(r, 5)); return { content: [{ type: 'text', text: 'data' }] }; }), { now: () => time, cacheMs: 2000 });
  const invoke = () => gateway.call(TOOL_NAMES[0], { query: 'traffic last 3 days' });
  await Promise.all([invoke(), invoke()]); assert.equal(calls, 1);
  await invoke(); assert.equal(calls, 1);
  time += 3000; await invoke(); assert.equal(calls, 2);
  const failing = await createGateway(fake(async () => ({ content: [{ type: 'text', text: 'An error occurred while fetching the data.' }] })), { now: () => time });
  assert.equal((await failing.call(TOOL_NAMES[0], { query: 'traffic' })).isError, true);
});
test('rejects credential overrides, unknown tools, malformed dates and oversized queries', async () => {
  let calls = 0;
  const gateway = await createGateway(fake(async () => { calls++; }));
  for (const [name,args] of [['write', {}], [TOOL_NAMES[0], { query: 'traffic', token: 'secret' }], [TOOL_NAMES[0], { query: 'x'.repeat(4001) }], [TOOL_NAMES[1], { filters: { date: { start: 'bad', end: 'bad' } } }], [TOOL_NAMES[1], { filters: { date: { start: '2026-01-01T00:00:00.000Z', end: '2026-01-02T00:00:00.000Z' } }, count: -1 }]]) assert.equal((await gateway.call(name,args)).isError,true);
  assert.equal(calls,0);
});
test('timeouts do not expose upstream secrets or internal errors', async () => {
  const gateway = await createGateway(fake(async () => { throw new Error('private-token-and-url'); }));
  const result = await gateway.call(TOOL_NAMES[0], { query: 'traffic today' });
  assert.equal(result.isError,true); assert.ok(!JSON.stringify(result).includes('private-token'));
});
test('JWT verification and real HTTP MCP initialization/list/call', async t => {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey); jwk.kid = 'test';
  const config = readConfig(env);
  const verify = tokenVerifier(config, createLocalJWKSet({ keys: [jwk] }));
  const sign = async (claims = {}) => new SignJWT({ scope: 'clarity:read', sub: 'owner', ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'test' }).setIssuer(config.issuer).setAudience(config.resource).setIssuedAt().setExpirationTime('5m').sign(privateKey);
  const token = await sign();
  assert.equal((await verify(token)).sub,'owner');
  for (const claims of [{ sub:'stranger' }, { scope:'other' }]) await assert.rejects(verify(await sign(claims)));
  const wrongAudience = await new SignJWT({ scope:'clarity:read',sub:'owner' }).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer(config.issuer).setAudience('https://wrong.example').setIssuedAt().setExpirationTime('5m').sign(privateKey);
  await assert.rejects(verify(wrongAudience));
  const expired = await new SignJWT({ scope:'clarity:read',sub:'owner' }).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer(config.issuer).setAudience(config.resource).setIssuedAt().setExpirationTime(1).sign(privateKey);
  await assert.rejects(verify(expired));
  let upstreamCalls = 0;
  const gateway = await createGateway(fake(async () => { upstreamCalls++; return { content:[{type:'text',text:'{"sessions":12}'}] }; }));
  const listener = createApp(config, gateway, verify).listen(0,'127.0.0.1'); await once(listener,'listening');
  t.after(() => new Promise(resolve=>listener.close(resolve)));
  const url = new URL(`http://127.0.0.1:${listener.address().port}/mcp`);
  const denied = await fetch(url,{method:'POST'});assert.equal(denied.status,401); assert.match(denied.headers.get('www-authenticate'),/oauth-protected-resource/);
  const stranger = await fetch(url,{method:'POST',headers:{authorization:`Bearer ${await sign({sub:'stranger'})}`}});assert.equal(stranger.status,401);
  const badOrigin = await fetch(url,{method:'POST',headers:{authorization:`Bearer ${token}`,origin:'https://evil.example'}});assert.equal(badOrigin.status,403);
  assert.equal(upstreamCalls,0);
  const discovery = await fetch(new URL('/.well-known/oauth-protected-resource/mcp',url));assert.equal((await discovery.json()).resource,config.resource);
  const client = new Client({name:'test',version:'1'});
  const transport = new StreamableHTTPClientTransport(url,{requestInit:{headers:{Authorization:`Bearer ${token}`}}});
  await client.connect(transport);
  const tools = await client.listTools();assert.equal(tools.tools.length,3);assert.ok(tools.tools.every(x=>x.annotations.readOnlyHint));
  const result = await client.callTool({name:TOOL_NAMES[0],arguments:{query:'traffic last 3 days'}});assert.match(result.content[0].text,/sessions/);assert.equal(upstreamCalls,1);
  await client.close();
});

test('local stdio entry point exposes official tools without making data calls', async () => {
  const client = new Client({ name: 'stdio-check', version: '1' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL('../src/stdio.mjs', import.meta.url))], env: { CLARITY_API_TOKEN: 'test-discovery-only' }, stderr: 'pipe' });
  transport.stderr?.resume();
  try { await client.connect(transport); assert.equal((await client.listTools()).tools.length, 3); }
  finally { await client.close(); }
});
