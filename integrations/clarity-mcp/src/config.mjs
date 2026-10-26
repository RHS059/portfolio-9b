function httpsUrl(value, name) {
  const url = new URL(value || 'invalid');
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search) throw new Error(`${name} must be a plain HTTPS URL`);
  return url;
}
export function readConfig(env = process.env) {
  if (!env.CLARITY_API_TOKEN?.trim()) throw new Error('Set CLARITY_API_TOKEN in the host secret store');
  const resource = httpsUrl(env.MCP_RESOURCE_URL, 'MCP_RESOURCE_URL');
  if (resource.pathname !== '/mcp') throw new Error('MCP_RESOURCE_URL must end in /mcp');
  const issuer = httpsUrl(env.OAUTH_ISSUER, 'OAUTH_ISSUER');
  const jwks = httpsUrl(env.OAUTH_JWKS_URL, 'OAUTH_JWKS_URL');
  const subjects = (env.OAUTH_ALLOWED_SUBJECTS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!subjects.length) throw new Error('OAUTH_ALLOWED_SUBJECTS must identify the owner; access is denied by default');
  const port = Number(env.PORT || 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  return { resource: resource.href, issuer: env.OAUTH_ISSUER, jwks: jwks.href, subjects, port,
    allowedOrigins: [resource.origin, ...(env.MCP_ALLOWED_ORIGINS || '').split(',').filter(Boolean)],
    token: env.CLARITY_API_TOKEN };
}
