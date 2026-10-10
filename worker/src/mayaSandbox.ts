import { routeMayaPayment } from './mayaPayments';
import type { Env } from './utils';
export { MAYA_STAGE_ENDPOINT, mayaSandboxEnabled } from './mayaPayments';

export function routeMayaSandbox(req: Request, env: Env): Promise<Response> {
  return routeMayaPayment(req, env, false);
}
