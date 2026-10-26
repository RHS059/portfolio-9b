import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { connectClarity } from './upstream.mjs';
import { createGateway, createMcpServer } from './bridge.mjs';
try {
  const upstream = await connectClarity(process.env.CLARITY_API_TOKEN);
  const server = createMcpServer(await createGateway(upstream));
  await server.connect(new StdioServerTransport());
  const stop = () => { void upstream.close().finally(() => process.exit(0)); };
  process.on('SIGTERM', stop); process.on('SIGINT', stop); process.stdin.on('end', stop);
} catch { console.error('Clarity MCP startup failed. Set CLARITY_API_TOKEN and install dependencies.'); process.exitCode = 1; }
