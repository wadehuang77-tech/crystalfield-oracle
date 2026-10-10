import { mayaAdminLive } from './mayaFeatures';
import { readSession, type Env } from './utils';
import { MAYA_PRO_PRODUCT } from '../../app/src/lib/mayaPro';
import { MAYA_RELATIONSHIP_PRODUCT } from '../../app/src/lib/mayaRelationship';

type Product = typeof MAYA_PRO_PRODUCT.code | typeof MAYA_RELATIONSHIP_PRODUCT.code;
export async function premiumAdminGrant(req: Request, env: Env, userId: string, product: Product) {
  const user = await readSession(req, env, true);
  if (!user || user.id !== userId || !await mayaAdminLive(req, env, user)) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(['maya-premium-admin', user.id, product])));
  const id = `admin-${Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')}`;
  return { id, order_id: id, source: 'admin_complimentary', email: user.email };
}

export async function premiumAdminAccess(req: Request, env: Env, userId: string, product: Product, id: string) {
  if (!id.startsWith('admin-')) return null;
  const grant = await premiumAdminGrant(req, env, userId, product);
  if (!grant || grant.id !== id) return null;
  const order = await env.DB.prepare("SELECT id FROM orders WHERE id=? AND user_id=? AND item_id=? AND item_type='maya_admin' AND amount=0 AND status='complimentary'")
    .bind(grant.order_id, userId, product).first();
  const url = new URL(req.url);
  const create = req.method === 'POST' && url.pathname === (product === MAYA_PRO_PRODUCT.code ? '/api/maya/pro/reports' : '/api/maya/relationship/reports');
  return order || create ? grant : null;
}
