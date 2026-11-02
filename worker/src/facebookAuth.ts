import { signJwt } from './auth';
import { buildSessionCookie,isAllowedOrigin,json,readBody,validEmail,type Env } from './utils';

const COOKIE='facebook_oauth_csrf';
const cookie=(value:string,age=600)=>`${COOKIE}=${value}; Path=/api/auth/facebook; Max-Age=${age}; HttpOnly; Secure; SameSite=None`;
const configured=(env:Env)=>!!env.FACEBOOK_APP_ID&&/^\d+$/.test(env.FACEBOOK_APP_ID)&&!!env.FACEBOOK_APP_SECRET&&/^v\d+\.\d+$/.test(env.FACEBOOK_GRAPH_VERSION??'');
function response(req:Request,env:Env,body:unknown,status=200,headers:Record<string,string>={}){return json(req,env,body,{status,headers:{'Cache-Control':'no-store',...headers}});}
export async function facebookAuthConfig(req:Request,env:Env){
  if(!isAllowedOrigin(req,env))return response(req,env,{error:'Bad origin'},403);
  const enabled=configured(env)&&!!await env.DB.prepare("SELECT name FROM sqlite_master WHERE name='facebook_identities' AND type='table'").first();
  const csrf=enabled?crypto.randomUUID():null;
  return response(req,env,{enabled,app_id:enabled?env.FACEBOOK_APP_ID:null,version:enabled?env.FACEBOOK_GRAPH_VERSION:null,csrf_token:csrf},200,csrf?{'Set-Cookie':cookie(csrf)}:{});
}
async function graph(url:URL,token:string):Promise<Record<string,unknown>>{
  const result=await fetch(url,{headers:{Authorization:`Bearer ${token}`},redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!result.ok)throw new Error('FACEBOOK_PROVIDER_FAILED');
  const body=await result.json<Record<string,unknown>>();if(!body||body.error)throw new Error('FACEBOOK_PROVIDER_FAILED');return body;
}
export async function facebookSignin(req:Request,env:Env){
  if(!isAllowedOrigin(req,env))return response(req,env,{error:'Bad origin'},403);
  if(!configured(env))return response(req,env,{code:'FACEBOOK_NOT_CONFIGURED',error:'Facebook 登入尚未啟用 / Facebook sign-in is not enabled.'},503);
  const body=await readBody<{access_token?:string;csrf_token?:string}>(req,20000);
  const csrf=(req.headers.get('cookie')??'').split(';').map(s=>s.trim()).find(s=>s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);
  if(!csrf||!body.csrf_token||csrf!==body.csrf_token)return response(req,env,{error:'Facebook 登入驗證已過期，請重新整理 / Refresh the page before signing in.'},403);
  if(typeof body.access_token!=='string'||body.access_token.length<10||body.access_token.length>16000)return response(req,env,{error:'Invalid Facebook credential'},400);
  if(!await env.DB.prepare("SELECT name FROM sqlite_master WHERE name='facebook_identities' AND type='table'").first())return response(req,env,{error:'Facebook 登入尚未啟用 / Facebook sign-in is not enabled.'},503);
  try{
    const base=`https://graph.facebook.com/${env.FACEBOOK_GRAPH_VERSION}`;
    const debugUrl=new URL(`${base}/debug_token`);debugUrl.searchParams.set('input_token',body.access_token);
    const debug=(await graph(debugUrl,`${env.FACEBOOK_APP_ID}|${env.FACEBOOK_APP_SECRET}`)).data as Record<string,unknown>|undefined;
    const nowSec=Math.floor(Date.now()/1000);
    if(!debug||debug.is_valid!==true||String(debug.app_id)!==env.FACEBOOK_APP_ID||debug.type!=='USER'||typeof debug.user_id!=='string'||!/^\d+$/.test(debug.user_id)
      ||typeof debug.expires_at!=='number'||debug.expires_at<=nowSec||typeof debug.data_access_expires_at!=='number'||debug.data_access_expires_at<=nowSec)
      return response(req,env,{error:'Facebook 帳戶驗證失敗 / Facebook verification failed.'},401);
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.FACEBOOK_APP_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const proof=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(body.access_token)))).map(b=>b.toString(16).padStart(2,'0')).join('');
    const meUrl=new URL(`${base}/me`);meUrl.searchParams.set('fields','id,name,email');meUrl.searchParams.set('appsecret_proof',proof);
    const me=await graph(meUrl,body.access_token);
    if(me.id!==debug.user_id)return response(req,env,{error:'Facebook verification failed'},401);
    type Profile={id:string;email:string;token_generation:number|null};
    const linked=()=>env.DB.prepare(`SELECT p.id,p.email,p.token_generation FROM facebook_identities f JOIN profiles p ON p.id=f.user_id WHERE f.app_id=? AND f.facebook_sub=?`).bind(env.FACEBOOK_APP_ID!,debug.user_id).first<Profile>();
    let profile=await linked();
    if(!profile){
      if(typeof me.email!=='string'||!validEmail(me.email))return response(req,env,{error:'Facebook 未提供電子郵件，請改用 Google 或晶域心語帳號 / Facebook did not provide an email. Use Google or your CrystalField account.'},422);
      const email=me.email.trim().toLowerCase();
      // Facebook email is not authoritative proof of ownership of an existing local account.
      if(await env.DB.prepare('SELECT id FROM profiles WHERE email=?').bind(email).first())return response(req,env,{code:'ACCOUNT_LINK_REQUIRED',error:'此電子郵件已有晶域心語帳號，請使用原帳密或 Google 登入 / This email already has an account. Use its password or Google sign-in.'},409);
      const id=crypto.randomUUID(),now=new Date().toISOString(),name=typeof me.name==='string'?me.name.trim().slice(0,100):null;
      try{await env.DB.batch([
        env.DB.prepare("INSERT INTO profiles(id,name,email,phone,password_hash,created_at,updated_at,purchased_spreads) VALUES(?,?,?,NULL,NULL,?,?,'[]')").bind(id,name,email,now,now),
        env.DB.prepare('INSERT INTO facebook_identities(app_id,facebook_sub,user_id,created_at) VALUES(?,?,?,?)').bind(env.FACEBOOK_APP_ID!,debug.user_id,id,now),
      ]);}catch{profile=await linked();if(!profile)return response(req,env,{error:'帳號建立未完成，請使用原帳號登入或重試 / Account creation did not complete. Use your existing sign-in method or retry.'},409);}
      profile=await linked();
    }
    if(!profile)throw new Error('PROFILE_MISSING');
    const token=await signJwt({sub:profile.id,email:profile.email,gen:profile.token_generation??0},env.JWT_SECRET,604800);
    const result=response(req,env,{authenticated:true,user:{id:profile.id,email:profile.email}},200,{'Set-Cookie':buildSessionCookie(token,604800)});
    result.headers.append('Set-Cookie',cookie('',0));return result;
  }catch{return response(req,env,{error:'Facebook 登入暫時無法完成，請稍後重試 / Facebook sign-in is temporarily unavailable.'},502);}
}
