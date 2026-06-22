export function formatOrderStatus(status: string): string {
  switch (status) {
    case 'paid':      return '已付款';
    case 'pending':   return '待付款';
    case 'failed':    return '付款失敗';
    case 'cancelled': return '已取消';
    default:          return status;
  }
}

export function formatPaymentType(type: string | null | undefined): string {
  if (!type) return '—';
  if (type === 'admin') return '後台直接解鎖';
  if (type.startsWith('Credit_'))  return '信用卡';
  if (type.startsWith('ATM_'))     return 'ATM 轉帳';
  if (type.startsWith('CVS_'))     return '超商代碼';
  if (type.startsWith('BARCODE_')) return '超商條碼';
  if (type.startsWith('WebATM_'))  return '網路 ATM';
  if (type.startsWith('TWQR_'))    return '台灣 Pay QR';
  return type;
}
