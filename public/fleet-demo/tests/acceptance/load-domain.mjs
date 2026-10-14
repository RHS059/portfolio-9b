import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

// Default location after integration: public/fleet-demo/tests/acceptance/.
// An explicit root permits testing an unchanged upstream checkout independently.
export const demoRoot = process.env.FLEET_DEMO_ROOT
  ? resolve(process.env.FLEET_DEMO_ROOT)
  : fileURLToPath(new URL('../../', import.meta.url));
export const domain = await import(pathToFileURL(resolve(demoRoot, 'src/domain/readings/index.js')));
export const reviewAdapter = await import(pathToFileURL(resolve(demoRoot, 'src/app/review-adapter.js')));
