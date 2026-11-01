import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import {routeMayaApi} from '../src/maya';
import {signJwt} from '../src/auth';
import type {Env} from '../src/utils';
async function main(){
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-06-25',d1Databases:['DB']});
 try {
 const db=await mf.getD1Database('DB');
 await db.prepare('CREATE TABLE profiles(id TEXT PRIMARY KEY,email TEXT UNIQUE,token_generation INTEGER DEFAULT 0)').run();
 await db.prepare('CREATE TABLE admins(id TEXT PRIMARY KEY)').run();
 for(const name of ['004-orders.sql','025_maya_dreamspell.sql','027_maya_production_payment_ai.sql','028_maya_admin_reports.sql']){
 const sql=await readFile(new URL('../../d1/migrations/'+name,import.meta.url),'utf8');
 await db.batch(sql.replace(/--[^\n]*/g,'').split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));}
 for(const id of ['owner','other'])await db.prepare('INSERT INTO profiles(id,email) VALUES(?,?)').bind(id,id+'@example.test').run();
 const env={DB:db,DB_CARDS:db,JWT_SECRET:'test-only',ENV:'dev',MAYA_AI_MODE:'mock',MAYA_PUBLIC_ENABLED:'true',MAYA_MEMBER_ENABLED:'true',MAYA_AI_ENABLED:'true',ALLOWED_ORIGINS:'https://test.example'} as unknown as Env;
 const tokens={owner:await signJwt({sub:'owner',email:'owner@example.test'},env.JWT_SECRET),other:await signJwt({sub:'other',email:'other@example.test'},env.JWT_SECRET)};
 const call=(path:string,body?:unknown,role:keyof typeof tokens='owner')=>routeMayaApi(new Request('https://test.example/api/maya/'+path,{method:body?'POST':'GET',headers:{Origin:'https://test.example','Content-Type':'application/json',Authorization:'Bearer '+tokens[role]},...(body?{body:JSON.stringify(body)}:{})}),env);
 const profileResponse=await call('calculate',{birth_date:'1990-12-31',locale:'zh-TW'});assert.equal(profileResponse.status,200,await profileResponse.clone().text());
 const {profile}=await profileResponse.json() as any;
 const input={locale:'zh-TW',product_code:'MAYA_BASIC_199',profile_id:profile.id,idempotency_key:'paid-basic-test',entitlement_id:'not-purchased'};
 const denied=await call('reports',input);assert.equal(denied.status,403,await denied.clone().text());
 assert.equal((await call('reports',{...input,entitlement_id:undefined,idempotency_key:'no-entitlement'})).status,400,'an unpaid request without an entitlement is rejected');
 assert.equal((await call('reports',{...input,product_code:'MAYA_FULL_499',idempotency_key:'paid-full-test'})).status,403);
 const generated=await db.prepare('SELECT COUNT(*) AS n FROM maya_admin_reports').first<{n:number}>();assert.equal(generated?.n,0,'no report is generated before payment');
 const list=await (await call('reports')).json() as any;assert.equal(list.reports.length,0);
 console.log('PASS: Personal Life Gifts (MAYA_BASIC_199) requires NT$199 payment; nothing is generated or listed before payment; full plan remains paid (local mock AI only).');
 } finally {await mf.dispose();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
