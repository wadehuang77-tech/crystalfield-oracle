import { requireAdmin, type Env, type SessionUser } from './utils';

export async function mayaAdminLive(req: Request, env: Env, user: SessionUser | null): Promise<boolean> {
  const allowed = env.ENV === 'production' && mayaFeatures(env).ai && env.MAYA_ADMIN_LIVE_ENABLED === 'true'
    && env.MAYA_AI_MODE === 'live' && !!user && user.email.toLowerCase().trim() === 'wadehuang77@gmail.com'
    && await requireAdmin(req, env, user);
  if (!allowed || !user) return false;
  const profile = await env.DB.prepare('SELECT email FROM profiles WHERE id=?').bind(user.id).first<{ email: string }>();
  return profile?.email.toLowerCase().trim() === 'wadehuang77@gmail.com';
}

export async function mayaSessionFeatures(req: Request, env: Env, user: SessionUser | null) {
  const features = mayaFeatures(env, user?.id);
  const adminPreview = features.public && env.MAYA_ADMIN_PREVIEW_ENABLED === 'true'
    && !!user && await requireAdmin(req, env, user);
  const result = adminPreview ? { ...features, member: true, admin_preview: true as const } : features;
  return await mayaAdminLive(req, env, user) ? { ...result, admin_live: true as const } : result;
}

export function mayaFeatures(env: Env, sessionUserId?: string) {
  const publicEnabled = env.MAYA_PUBLIC_ENABLED === 'true';
  const generalMember = publicEnabled && env.MAYA_MEMBER_ENABLED === 'true';
  let testMember = false;
  if (env.MAYA_MEMBER_TEST_USER_IDS) {
    const ids = env.MAYA_MEMBER_TEST_USER_IDS.split(',').map(id => id.trim());
    if (ids.length !== 2 || new Set(ids).size !== 2 || ids.some(id => !/^[a-zA-Z0-9_-]{1,80}$/.test(id))) {
      throw new Error('Invalid Maya member test allowlist');
    }
    testMember = publicEnabled && !!sessionUserId && ids.includes(sessionUserId)
      && env.MAYA_PAYMENT_ENABLED !== 'true' && env.MAYA_AI_ENABLED !== 'true' && env.MAYA_SANDBOX_ENABLED !== 'true';
  }
  const member = generalMember || testMember;
  const conflict = env.MAYA_PAYMENT_ENABLED === 'true' && env.MAYA_SANDBOX_ENABLED === 'true';
  return {
    public: publicEnabled,
    member,
    payment: generalMember && !conflict && env.MAYA_PAYMENT_ENABLED === 'true',
    sandbox: generalMember && !conflict && env.MAYA_SANDBOX_ENABLED === 'true',
    ai: generalMember && env.MAYA_AI_ENABLED === 'true',
  };
}
