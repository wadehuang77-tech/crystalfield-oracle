import type { Env,SessionUser } from './utils';
import { buildAioCheckOutForm,makeMerchantTradeNo } from './ecpay';
import { VedicAnnualError,annualReportFacts } from './vedicAnnualCalculation';
import type { VedicAnnualFacts } from '../../app/src/lib/vedicAnnual';

export async function annualCheckout(req:Request,env:Env,caseId:string,user:SessionUser,en:boolean) {
  const row=await env.DB.prepare('SELECT calculation_json FROM vedic_annual_cases WHERE id=? AND user_id=?').bind(caseId,user.id).first<{calculation_json:string}>();
  if(!row)throw new VedicAnnualError('NOT_FOUND',404);
  const facts=annualReportFacts(JSON.parse(row.calculation_json) as VedicAnnualFacts);
  if(!facts.dashaCoverage.mahadasha||!facts.dashaCoverage.antardasha)throw new VedicAnnualError('DASHA_COVERAGE');
  if(!env.ECPAY_MERCHANT_ID||!env.ECPAY_HASH_KEY||!env.ECPAY_HASH_IV)throw new VedicAnnualError('RELEASE_PENDING',503);
  const existing=()=>env.DB.prepare(`SELECT o.id,o.merchant_trade_no,o.status,p.merchant_id FROM vedic_annual_checkout p JOIN orders o ON o.id=p.order_id WHERE p.case_id=? AND o.user_id=?`).bind(caseId,user.id).first<{id:string;merchant_trade_no:string;status:string;merchant_id:string}>();
  let order=await existing();
  if(!order){
    const id=crypto.randomUUID(),trade=makeMerchantTradeNo();
    try{await env.DB.batch([
      env.DB.prepare(`INSERT INTO orders(id,merchant_trade_no,user_id,email,item_type,item_id,item_name,amount,status,picks_payload)
        VALUES(?,?,?,?,'vedic_annual','vedic_annual',?,599,'pending',?)`).bind(id,trade,user.id,user.email,en?'Vedic Annual Outlook':'印度占星流年運勢',JSON.stringify({vedic_annual_case_id:caseId})),
      env.DB.prepare('INSERT INTO vedic_annual_checkout(case_id,order_id,merchant_id) VALUES(?,?,?)').bind(caseId,id,env.ECPAY_MERCHANT_ID),
    ]);}catch(error){if(!await existing())throw error;}
    order=await existing();
  }
  if(!order)throw new VedicAnnualError('INTERNAL_ERROR',500);
  if(order.status==='paid')return {already_paid:true,order_id:order.id};
  // Do not replace a potentially payable trade, refund, or cancelled order with another charge.
  if(!['pending','failed'].includes(order.status)||order.merchant_id!==env.ECPAY_MERCHANT_ID)throw new VedicAnnualError('ORDER_REVIEW',409);
  const back=`https://www.crystalfield101.com${en?'/en':''}/vedic-astrology/annual?case_id=${encodeURIComponent(caseId)}&payment=return`;
  const ecpay=await buildAioCheckOutForm({merchantId:env.ECPAY_MERCHANT_ID,hashKey:env.ECPAY_HASH_KEY,hashIV:env.ECPAY_HASH_IV,
    merchantTradeNo:order.merchant_trade_no,amount:599,itemName:en?'Vedic Annual Outlook':'印度占星流年運勢',tradeDesc:en?'CrystalField annual report':'晶域心語流年報告',
    returnURL:`${new URL(req.url).origin}/api/ecpay-webhook`,clientBackURL:back,locale:en?'en':'zh-TW'},env.ECPAY_ENV);
  return {order_id:order.id,amount:599,ecpay};
}

/** Called ONLY after the existing callback verified CheckMacValue and SimulatePaid. */
export async function verifiedAnnualPayment(env:Env,params:Record<string,string>,orderId:string):Promise<Response> {
  const fail=(text:string)=>new Response(`0|${text}`,{status:400});
  const row=await env.DB.prepare(`SELECT o.*,p.case_id,p.merchant_id,c.user_id case_owner FROM orders o
    JOIN vedic_annual_checkout p ON p.order_id=o.id JOIN vedic_annual_cases c ON c.id=p.case_id WHERE o.id=?`).bind(orderId)
    .first<{id:string;user_id:string;item_id:string;item_type:string;amount:number;status:string;picks_payload:string;ecpay_trade_no:string|null;case_id:string;merchant_id:string;case_owner:string;merchant_trade_no:string}>();
  if(!row||!env.ECPAY_MERCHANT_ID||row.merchant_id!==env.ECPAY_MERCHANT_ID||params.MerchantID!==row.merchant_id
    ||row.item_id!=='vedic_annual'||row.item_type!=='vedic_annual'||row.amount!==599||row.user_id!==row.case_owner
    ||params.MerchantTradeNo!==row.merchant_trade_no||JSON.parse(row.picks_payload).vedic_annual_case_id!==row.case_id)return fail('Annual order mismatch');
  if(params.RtnCode!=='1'){
    await env.DB.prepare("UPDATE orders SET status='failed',updated_at=datetime('now') WHERE id=? AND status='pending'").bind(orderId).run();
    return new Response('1|OK');
  }
  if(params.TradeAmt!=='599'||!params.TradeNo?.trim())return fail('Annual payment mismatch');
  if(!['pending','failed','paid'].includes(row.status))return fail('Annual order revoked');
  if(row.status==='paid'&&row.ecpay_trade_no!==params.TradeNo)return fail('Trade conflict');
  const collision=await env.DB.prepare('SELECT id FROM orders WHERE ecpay_trade_no=? AND id<>?').bind(params.TradeNo,orderId).first();
  if(collision)return fail('Duplicate trade');
  await env.DB.batch([
    env.DB.prepare(`UPDATE orders SET status='paid',ecpay_trade_no=?,ecpay_payment_type=?,raw_callback=?,paid_at=COALESCE(paid_at,datetime('now')),updated_at=datetime('now') WHERE id=? AND status IN ('pending','failed','paid')`).bind(params.TradeNo,params.PaymentType??'',JSON.stringify(params),orderId),
    env.DB.prepare(`INSERT OR IGNORE INTO vedic_annual_entitlements(case_id,user_id,order_id,amount,status,source)
      SELECT ?,?,?,599,'active','verified_payment' WHERE EXISTS(SELECT 1 FROM orders WHERE id=? AND status='paid' AND ecpay_trade_no=?)`).bind(row.case_id,row.user_id,orderId,orderId,params.TradeNo),
  ]);
  return new Response('1|OK');
}
