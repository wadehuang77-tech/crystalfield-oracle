import {vedicCoreReading} from '../../shared/vedicCoreReading';
import assert from 'node:assert/strict';
import {signJwt} from '../src/auth';
import {getVedicBasicReading} from '../src/vedicBasicReading';
import type {Env} from '../src/utils';
async function main(){
 const secret='local-only',member=await signJwt({sub:'member',email:'test@example.test'},secret),token=await signJwt({sub:'chart',email:'vedic-chart@crystalfield.local'},secret);
 let owner:string|null=null;
 let order:any=null;
 const chart={lagna:'Aries',moonSign:'Taurus',houseLords:{'1':'Mars'},housePlacements:{Mars:10}},full=vedicCoreReading(chart);
 const env={JWT_SECRET:secret,DB:{prepare(sql:string){return {bind(){return this;},async first(){if(sql.includes('FROM orders'))return order;if(sql.includes('profiles'))return {token_generation:0};if(sql.includes('vedic_charts'))return {user_id:owner,chart_json:JSON.stringify(chart),free_result_json:JSON.stringify(full)};return null;}}}}} as unknown as Env;
 const call=(auth=false,chartToken=token,reading_kind?:string)=>getVedicBasicReading(new Request('https://test/api/vedic-astrology/basic-reading',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+member}:{})},body:JSON.stringify({chart_id:'chart',chart_token:chartToken,reading_kind})}),env);
 let r=await call();assert.equal(r.status,200);const preview=await r.json() as any;assert.equal(preview.results.archetype.body,full.archetype.body.slice(0,Math.ceil(full.archetype.body.length/2)));assert.equal(preview.preview,true);
 r=await call(true);assert.equal(r.status,200);assert.deepEqual((await r.json() as any).results,full);
 assert.equal((await call(false,'invalid')).status,401);
 owner='other';assert.equal((await call(true)).status,401);
 owner='member';assert.equal((await call(true,'')).status,200);
 const signs=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
 for(const lagna of signs)for(const moonSign of signs)for(const lord of ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'])for(let house=1;house<=12;house++){
   const reading=vedicCoreReading({lagna,moonSign,houseLords:{'1':lord},housePlacements:{[lord]:house}});
   const count=Array.from((reading.archetype.body+reading.talents.body+reading.currentCycle.body).replace(/[\p{P}\p{Z}\s]/gu,'')).length;
   assert.ok(count>=120&&count<=150,`${lagna}/${moonSign}/${lord}/${house}: ${count}`);
 }
 assert.match(full.currentCycle.body,/火星落第10宮/);
 assert.match(vedicCoreReading({}).currentCycle.body,/缺少/);
 assert.match(vedicCoreReading({...chart,housePlacements:{Mars:13}}).currentCycle.body,/缺少/);
 assert.match(vedicCoreReading(chart,'en').currentCycle.body,/Mars.*house 10/);
 console.log('PASS: 12,096 copy combinations within 120–150 characters, actual ruler/house, missing-data fallback, English labels.');
 assert.equal((await call(true,token,'paid')).status,401);
 order={user_id:'member',status:'paid',item_id:'vedic_basic',picks_payload:JSON.stringify({vedic_chart_id:'chart'})};
 assert.equal((await call(true,token,'paid')).status,200);
 assert.equal((await call(false,token,'paid')).status,401);
 order.status='refunded';assert.equal((await call(true,token,'paid')).status,401);
 order.status='paid';order.user_id='other';assert.equal((await call(true,token,'paid')).status,401);
 console.log('PASS: paid reading requires verified paid owner order; unpaid, guest, refund and other owner denied.');
 console.log('PASS: guest half-only response, signed-in full basic, invalid token and other owner denied. No provider calls.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
