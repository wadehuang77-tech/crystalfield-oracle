import assert from 'node:assert/strict';
import {signJwt} from '../src/auth';
import {getVedicBasicReading} from '../src/vedicBasicReading';
import type {Env} from '../src/utils';
async function main(){
 const secret='local-only',member=await signJwt({sub:'member',email:'test@example.test'},secret),token=await signJwt({sub:'chart',email:'vedic-chart@crystalfield.local'},secret);
 let owner:string|null=null;
 const section={title:'Title',body:'1234567890'},full={archetype:section,talents:{...section,items:['one','two']},currentCycle:section};
 const env={JWT_SECRET:secret,DB:{prepare(sql:string){return {bind(){return this;},async first(){if(sql.includes('profiles'))return {token_generation:0};if(sql.includes('vedic_charts'))return {user_id:owner,chart_json:'{}',free_result_json:JSON.stringify(full)};return null;}}}}} as unknown as Env;
 const call=(auth=false,chartToken=token)=>getVedicBasicReading(new Request('https://test/api/vedic-astrology/basic-reading',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+member}:{})},body:JSON.stringify({chart_id:'chart',chart_token:chartToken})}),env);
 let r=await call();assert.equal(r.status,200);const preview=await r.json() as any;assert.equal(preview.results.archetype.body,'12345');assert.equal(preview.preview,true);
 r=await call(true);assert.equal(r.status,200);assert.deepEqual((await r.json() as any).results,full);
 assert.equal((await call(false,'invalid')).status,401);
 owner='other';assert.equal((await call(true)).status,401);
 owner='member';assert.equal((await call(true,'')).status,200);
 console.log('PASS: guest half-only response, signed-in full basic, invalid token and other owner denied. No provider calls.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
