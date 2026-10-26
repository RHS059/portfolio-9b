import express from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from './bridge.mjs';

export function tokenVerifier(config, keySet = createRemoteJWKSet(new URL(config.jwks))) {
  return async token => {
    const { payload } = await jwtVerify(token, keySet, {
      issuer: config.issuer, audience: config.resource,
      algorithms: ['RS256', 'ES256'], requiredClaims: ['exp', 'sub', 'iat'],
    });
    if (!config.subjects.includes(payload.sub)) throw new Error('Owner access required');
    if (typeof payload.scope !== 'string' || !payload.scope.split(' ').includes('clarity:read')) throw new Error('Missing scope');
    return payload;
  };
}

export function createApp(config, gateway, verify = tokenVerifier(config)) {
  const app = express();
  app.disable('x-powered-by');
  const origin = new URL(config.resource).origin;
  const metadataUrl = `${origin}/.well-known/oauth-protected-resource/mcp`;
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const requestOrigin = req.get('origin');
    if (requestOrigin && !config.allowedOrigins.includes(requestOrigin)) return res.status(403).json({ error: 'Origin not allowed' });
    if (requestOrigin) {
      res.set('Access-Control-Allow-Origin', requestOrigin).vary('Origin');
      res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id');
      res.set('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
      res.set('Access-Control-Expose-Headers', 'WWW-Authenticate');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.get('/healthz', (_req, res) => res.json({ status: 'ok', service: 'reid-clarity-mcp' }));
  app.get(['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp'], (_req, res) => res.json({
    resource: config.resource, authorization_servers: [config.issuer], scopes_supported: ['clarity:read'], bearer_methods_supported: ['header'],
  }));
  app.use('/mcp', async (req, res, next) => {
    const authorization = req.get('authorization');
    try {
      if (!authorization?.startsWith('Bearer ')) throw new Error('Missing token');
      await verify(authorization.slice(7));
      next();
    } catch {
      res.set('WWW-Authenticate', `Bearer resource_metadata="${metadataUrl}", scope="clarity:read", error="invalid_token"`);
      res.status(401).json({ error: 'Authorization required' });
    }
  });
  app.post('/mcp', express.json({ limit: '32kb' }), async (req, res) => {
    const server = createMcpServer(gateway, { oauth: true });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => { void transport.close(); void server.close(); });
    try { await server.connect(transport); await transport.handleRequest(req, res, req.body); }
    catch { if (!res.headersSent) res.status(500).json({ error: 'MCP request failed' }); }
  });
  app.all('/mcp', (_req, res) => res.status(405).set('Allow', 'POST').end());
  app.use((_err, _req, res, _next) => res.status(400).json({ error: 'Invalid request body' }));
  return app;
}
