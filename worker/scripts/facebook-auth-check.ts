import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Miniflare } from 'miniflare';
import { readFile } from 'node:fs/promises';
import { facebookAuthConfig,facebookSignin } from '../src/facebookAuth';
import { verifyJwt } from '../src/auth';
import type { Env } from '../src/utils';

test('Facebook config, CSRF, token verification, new identity and collision protection',async()=>{
  const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-06-25',d1Databases:{DB:'facebook-auth-test'}});
  const prior=globalThis.fetch;
  try{
    const {DB}=await mf.getBindings<{DB:D1Database}>();
    await DB.prepare('CREATE TABLE profiles(id TEXT PRIMARY KEY,name TEXT,email TEXT UNIQUE NOT NULL,phone TEXT,password_hash TEXT,created_at TEXT,updated_at TEXT,purchased_spreads TEXT,token_generation INTEGER DEFAULT 0)').run();
    await DB.prepare(await readFile(new URL('../../d1/migrations/035_facebook_identities.sql',import.meta.url),'utf8')).run();
    const env={DB,JWT_SECRET:'synthetic-only',FACEBOOK_APP_ID:'123',FACEBOOK_APP_SECRET:'synthetic-secret',FACEBOOK_GRAPH_VERSION:'v99.0',ALLOWED_ORIGINS:'https://www.crystalfield101.com'} as Env;
    const origin='https://www.crystalfield101.com';
    const config=await facebookAuthConfig(new Request('https://api.crystalfield101.com/api/auth/facebook/config',{headers:{Origin:origin}}),env);
    const payload=await config.json() as {enabled:boolean;csrf_token:string};assert.equal(payload.enabled,true);assert.ok(config.headers.get('set-cookie')?.includes('HttpOnly'));
    const disabled=await facebookAuthConfig(new Request('https://api.crystalfield101.com/api/auth/facebook/config',{headers:{Origin:origin}}),{...env,FACEBOOK_APP_SECRET:undefined});assert.equal((await disabled.json() as {enabled:boolean}).enabled,false);
    const request=(csrf=payload.csrf_token,requestOrigin=origin)=>new Request('https://api.crystalfield101.com/api/auth/facebook',{method:'POST',headers:{Origin:requestOrigin,Cookie:`facebook_oauth_csrf=${payload.csrf_token}`,'Content-Type':'application/json'},body:JSON.stringify({access_token:'synthetic-user-token',csrf_token:csrf})});
    let calls=0,wrongApp=false,expired=false,subject='456',email='new@example.test',meMismatch=false;
    globalThis.fetch=async input=>{calls++;const url=new URL(String(input));assert.equal(url.hostname,'graph.facebook.com');
      if(url.pathname.endsWith('/debug_token'))return Response.json({data:{is_valid:true,type:'USER',app_id:wrongApp?'999':'123',user_id:subject,expires_at:expired?1:Math.floor(Date.now()/1000)+3600,data_access_expires_at:Math.floor(Date.now()/1000)+3600}});
      assert.equal(url.pathname,'/v99.0/me');assert.ok(url.searchParams.get('appsecret_proof')?.match(/^[a-f0-9]{64}$/));return Response.json({id:meMismatch?'999':subject,email,name:'Synthetic Member'});
    };
    assert.equal((await facebookSignin(request('wrong'),env)).status,403);assert.equal((await facebookSignin(request(payload.csrf_token,'https://evil.test'),env)).status,403);assert.equal(calls,0);
    wrongApp=true;assert.equal((await facebookSignin(request(),env)).status,401);wrongApp=false;
    expired=true;assert.equal((await facebookSignin(request(),env)).status,401);expired=false;
    meMismatch=true;assert.equal((await facebookSignin(request(),env)).status,401);meMismatch=false;
    const success=await facebookSignin(request(),env);assert.equal(success.status,200);const signed=await success.json() as {user:{id:string}};
    const cookies=success.headers.getSetCookie();const token=cookies.find(s=>s.startsWith('bolt_session='))?.split(';')[0].slice('bolt_session='.length);assert.ok(token);assert.equal((await verifyJwt(token!,env.JWT_SECRET))?.sub,signed.user.id);
    email='changed@example.test';const repeat=await facebookSignin(request(),env);assert.equal((await repeat.json() as {user:{id:string}}).user.id,signed.user.id,'Stable provider subject retains account');
    subject='789';email='new@example.test';assert.equal((await facebookSignin(request(),env)).status,409,'Existing email cannot auto-link');
    email='';assert.equal((await facebookSignin(request(),env)).status,422);
    assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM profiles').first<{n:number}>())?.n,1);
    globalThis.fetch=async()=>new Response('',{status:500});assert.equal((await facebookSignin(request(),env)).status,502);
  }finally{globalThis.fetch=prior;await mf.dispose();}
});
