export type RegistrationIdentityResult =
  | { ok: true; name: string; phone: string }
  | { ok: false; error: string };

export function validateRegistrationIdentity(
  rawName: unknown,
  rawPhone: unknown,
): RegistrationIdentityResult {
  if (typeof rawName !== 'string') return { ok: false, error: '請輸入姓名' };
  const name = rawName.trim();
  if (!name) return { ok: false, error: '請輸入姓名' };
  if (name.length > 100) return { ok: false, error: '姓名不可超過 100 個字元' };
  if (/[\u0000-\u001f\u007f]/.test(name)) return { ok: false, error: '姓名格式錯誤' };

  if (typeof rawPhone !== 'string') return { ok: false, error: '請輸入手機號碼' };
  const phone = rawPhone.trim();
  if (!phone) return { ok: false, error: '請輸入手機號碼' };
  if (phone.length > 32 || !/^\+?[0-9\s().-]+$/.test(phone)) {
    return { ok: false, error: '手機號碼格式錯誤' };
  }
  const digitCount = phone.replace(/\D/g, '').length;
  if (digitCount < 7 || digitCount > 20) return { ok: false, error: '手機號碼格式錯誤' };

  return { ok: true, name, phone };
}
