import { readConfig } from './config.mjs';
import { connectClarity } from './upstream.mjs';
import { createGateway } from './bridge.mjs';
import { createApp } from './app.mjs';
try {
  const config = readConfig();
  const upstream = await connectClarity(config.token);
  const gateway = await createGateway(upstream);
  const listener = createApp(config, gateway).listen(config.port, '0.0.0.0', () => console.error(`Clarity MCP listening on port ${config.port}`));
  const stop = () => { listener.close(); void upstream.close().finally(() => process.exit(0)); };
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
} catch { console.error('Clarity MCP startup failed. Check required configuration and installed dependencies; no secrets logged.'); process.exitCode = 1; }
