import { connectClarity } from '../src/upstream.mjs';
import { createGateway } from '../src/bridge.mjs';
// Discovery-only. This does not authenticate with Clarity or consume analytics requests.
const upstream = await connectClarity('discovery-only-not-a-real-token');
try { const gateway = await createGateway(upstream); console.log(gateway.tools.map(t => t.name).join('\n')); }
finally { await upstream.close(); }
