import { createRequire } from 'node:module';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Credentials stay in the child environment, never argv, tool arguments or replies.
export async function connectClarity(token) {
  if (!token?.trim()) throw new Error('CLARITY_API_TOKEN is required');
  const entry = createRequire(import.meta.url).resolve('@microsoft/clarity-mcp-server');
  const transport = new StdioClientTransport({
    command: process.execPath, args: [entry], stderr: 'pipe',
    env: { PATH: process.env.PATH || '', CLARITY_API_TOKEN: token, TZ: 'UTC' },
  });
  // Upstream logs are intentionally not forwarded: they may contain query details.
  transport.stderr?.resume();
  const client = new Client({ name: 'reid-clarity-bridge', version: '1.0.0' });
  try { await client.connect(transport); } catch { await transport.close(); throw new Error('Clarity adapter failed to start'); }
  return client;
}
