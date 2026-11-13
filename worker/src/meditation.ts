import { json, readSession, requireAdmin, type Env } from './utils';

export async function meditationTracks(req: Request, env: Env) {
  const lang = new URL(req.url).searchParams.get('lang') === 'en' ? 'en' : 'zh';
  const rows = await env.DB.prepare('SELECT id,title_zh,description_zh,title_en,description_en,duration_seconds,is_free,is_published FROM meditation_audio_tracks WHERE is_published=1 ORDER BY sort_order').all();
  return json(req, env, { tracks: (rows.results ?? []).map((r: any) => ({ id:r.id, title:lang==='en'?r.title_en:r.title_zh, description:lang==='en'?r.description_en:r.description_zh, durationSeconds:r.duration_seconds, isFree:Boolean(r.is_free) })) });
}

export async function meditationAudio(req: Request, env: Env, trackId: string) {
  const row = await env.DB.prepare('SELECT id,is_free,is_published,r2_key FROM meditation_audio_tracks WHERE id=?').bind(trackId).first<any>();
  if (!row || !row.is_published) return new Response('Not found', { status: 404 });
  const user = await readSession(req, env);
  if (!row.is_free) {
    if (!user) return new Response('Login required', { status: 401 });
    const entitlement = await env.DB.prepare("SELECT 1 FROM meditation_entitlements WHERE user_id=? AND status='active' LIMIT 1").bind(user.id).first();
    if (!entitlement) return new Response('Entitlement required', { status: 403 });
  }
  const bucket = env.MEDITATION_AUDIO_BUCKET;
  if (!bucket || !row.r2_key) return new Response('Audio not configured', { status: 503 });
  const rangeHeader = req.headers.get('Range');
  if (rangeHeader && !/^bytes=\d+-\d*$/.test(rangeHeader)) return new Response('Range Not Satisfiable', { status: 416, headers: { 'Content-Range': 'bytes */*' } });
  const match = rangeHeader?.match(/^bytes=(\d+)-(\d*)$/);
  const range = match ? { offset: Number(match[1]), length: match[2] ? Number(match[2]) - Number(match[1]) + 1 : undefined } : undefined;
  const object = await bucket.get(row.r2_key, range ? { range } : undefined);
  if (!object) return new Response('Not found', { status: 404 });
  if (user) await env.DB.prepare('INSERT INTO meditation_playback_history (id,user_id,track_id) VALUES (?,?,?)').bind(crypto.randomUUID(), user.id, trackId).run();
  const headers = new Headers(); headers.set('Content-Type','audio/mpeg'); headers.set('Cache-Control','private, max-age=300');
  if (object.httpMetadata?.contentType) headers.set('Content-Type', object.httpMetadata.contentType);
  if (object.range) headers.set('Accept-Ranges','bytes');
  return new Response(object.body, { status: object.range ? 206 : 200, headers });
}

export async function adminMeditationTracks(req: Request, env: Env) {
  const user = await readSession(req, env); if (!user || !(await requireAdmin(req, env, user))) return new Response('Forbidden',{status:403});
  const url = new URL(req.url); const id = url.searchParams.get('id');
  if (id && req.method === 'PATCH') {
    const body = await req.json<any>(); const allowed = ['title_zh','description_zh','title_en','description_en','is_free','is_published','sort_order'];
    const fields = allowed.filter(k => body[k] !== undefined); if (!fields.length) return new Response('No changes',{status:400});
    await env.DB.prepare(`UPDATE meditation_audio_tracks SET ${fields.map(k=>`${k}=?`).join(',')},updated_at=datetime('now') WHERE id=?`).bind(...fields.map(k=>body[k]),id).run(); return json(req,env,{ok:true});
  }
  if (id && req.method === 'POST') {
    const bucket=env.MEDITATION_AUDIO_BUCKET; if (!bucket) return new Response('R2 not configured',{status:503});
    const file:any=(await req.formData()).get('file'); if (!(file instanceof File) || file.type !== 'audio/mpeg') return new Response('MP3 required',{status:400});
    const key=`meditation/${id}.mp3`; await bucket.put(key,file.stream(),{httpMetadata:{contentType:'audio/mpeg'}}); await env.DB.prepare("UPDATE meditation_audio_tracks SET r2_key=?,updated_at=datetime('now') WHERE id=?").bind(key,id).run(); return json(req,env,{ok:true});
  }
  if (id && req.method === 'DELETE') {
    const row = await env.DB.prepare('SELECT r2_key FROM meditation_audio_tracks WHERE id=?').bind(id).first<{r2_key?: string}>();
    if (!row) return new Response('Not found', { status: 404 });
    if (env.MEDITATION_AUDIO_BUCKET && row.r2_key) await env.MEDITATION_AUDIO_BUCKET.delete(row.r2_key);
    await env.DB.prepare('DELETE FROM meditation_audio_tracks WHERE id=?').bind(id).run();
    return json(req, env, { ok: true });
  }
  const rows = await env.DB.prepare('SELECT * FROM meditation_audio_tracks ORDER BY sort_order').all();
  return json(req, env, { tracks: rows.results ?? [] });
}
