import app from './index';
import { json, type Env } from './utils';

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const path = new URL(req.url).pathname;
    if (env.ENV !== 'dev' || env.MAYA_PAYMENT_ENABLED === 'true') {
      return json(req, env, { code: 'INVALID_TEST_ENVIRONMENT' }, { status: 503 });
    }
    if (path === '/api/health' && req.method === 'GET') {
      return json(req, env, { status: 'ok', environment: 'maya-isolated-test' }, {
        headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
      });
    }
    const auth = ['/api/auth/me', '/api/auth/google/config', '/api/auth/google', '/api/auth/signout'];
    if (path.startsWith('/api/maya/payments/') || (!path.startsWith('/api/maya/') && !auth.includes(path))) {
      return json(req, env, { code: 'NOT_FOUND' }, { status: 404 });
    }
    if (auth.includes(path) && (!env.JWT_SECRET || !env.GOOGLE_CLIENT_ID)) {
      return json(req, env, { code: 'TEST_AUTH_NOT_CONFIGURED', error: 'Test sign-in is not configured.' }, { status: 503 });
    }
    return app.fetch(req, env, ctx);
  },
};
