export const MAYA_SANDBOX_ENDPOINT = 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';
export const MAYA_PRODUCTION_ENDPOINT = 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5';
export interface MayaCheckoutForm {
  order_id: string;
  endpoint: string;
  fields: Record<string, string>;
}
export function validateMayaCheckoutForm(value: MayaCheckoutForm, mode: 'sandbox' | 'production' = 'sandbox'): void {
  const code = value.fields.CustomField1;
  const extra = [MAYA_PRO_PRODUCT, MAYA_RELATIONSHIP_PRODUCT].find(product => product.code === code);
  const amounts = isMayaProduct(code) ? mayaOrderAmounts(code) : extra && mode === 'production' ? [extra.price] : [];
  if (value.endpoint !== (mode === 'sandbox' ? MAYA_SANDBOX_ENDPOINT : MAYA_PRODUCTION_ENDPOINT) || !/^[A-Za-z0-9_-]{1,80}$/.test(value.order_id)
    || (mode === 'sandbox' ? value.fields.MerchantID !== '3002607'
      : !/^\d{7,10}$/.test(value.fields.MerchantID ?? '') || ['3002607','2000132'].includes(value.fields.MerchantID))
    || !amounts.some(amount => String(amount) === value.fields.TotalAmount)
    || !/^[A-F0-9]{64}$/.test(value.fields.CheckMacValue ?? '')
    || value.fields.CustomField2 !== value.order_id
    || !Object.values(value.fields).every((field) => typeof field === 'string')
    || Object.keys(value.fields).some((key) => !/^[A-Za-z0-9]+$/.test(key) || /hashkey|hashiv|period/i.test(key))) {
    throw new Error('Invalid Maya checkout response.');
  }
}
export function submitMayaCheckout(value: MayaCheckoutForm, mode: 'sandbox' | 'production' = 'sandbox'): void {
  validateMayaCheckoutForm(value, mode);
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = value.endpoint;
  for (const [name, field] of Object.entries(value.fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = field;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  try { form.submit(); } finally { form.remove(); }
}
import { isMayaProduct, mayaOrderAmounts } from './maya';
import { MAYA_PRO_PRODUCT } from './mayaPro';
import { MAYA_RELATIONSHIP_PRODUCT } from './mayaRelationship';
