interface EmailEnv {
  RESEND_API_KEY?: string;
  MAIL_FROM_ADDRESS?: string;
  MAIL_FROM_NAME?: string;
  MAIL_REPLY_TO?: string;
}

interface SendOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const DEFAULT_FROM_ADDRESS = 'crystalfield101@crystalfield101.com';
const DEFAULT_FROM_NAME    = '晶域心語';
const DEFAULT_REPLY_TO     = 'wadehuang77@gmail.com';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export async function sendEmail(env: EmailEnv, opts: SendOptions): Promise<void> {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const fromAddress = env.MAIL_FROM_ADDRESS || DEFAULT_FROM_ADDRESS;
  const fromName    = env.MAIL_FROM_NAME    || DEFAULT_FROM_NAME;
  const replyTo     = env.MAIL_REPLY_TO     || DEFAULT_REPLY_TO;

  const body = {
    from:     `${fromName} <${fromAddress}>`,
    to:       [opts.to],
    reply_to: replyTo,
    subject:  opts.subject,
    html:     opts.html,
    text:     opts.text,
  };

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Resend send failed: ${res.status} ${text.slice(0, 400)}`);
  }
}

export function passwordResetEmail(code: string): { subject: string; text: string; html: string } {
  const subject = '晶域心語 — 密碼重設驗證碼';

  const text =
`你好,

你正在重設「晶域心語」帳號的密碼。請在 15 分鐘內輸入以下驗證碼以繼續:

   ${code}

如果你沒有要求重設密碼,請忽略此郵件,你的密碼不會被改動。

— 晶域心語
crystalfield101.com`;

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#0a0d1c;font-family:'Noto Serif TC','PingFang TC','Hiragino Sans GB',Georgia,serif;color:#ede1c4;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0d1c;padding:40px 20px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#0b0f24;border:1px solid rgba(201,163,92,0.28);">
            <tr>
              <td style="padding:48px 40px 32px 40px;text-align:center;border-bottom:1px solid rgba(201,163,92,0.18);">
                <p style="margin:0;color:#c9a35c;font-size:13px;letter-spacing:0.5em;font-weight:500;">晶 域 心 語</p>
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                <h1 style="margin:0 0 16px 0;color:#f8f0d4;font-size:22px;font-weight:600;letter-spacing:0.18em;text-align:center;">
                  密 碼 重 設 驗 證 碼
                </h1>
                <p style="margin:0 0 32px 0;color:#d6c9a4;font-size:14px;line-height:1.9;text-align:center;letter-spacing:0.04em;">
                  請於 15 分鐘內,將以下驗證碼填入網站以繼續重設密碼。
                </p>
                <div style="text-align:center;margin:32px 0;">
                  <span style="display:inline-block;padding:18px 32px;background:rgba(201,163,92,0.08);border:1px solid rgba(201,163,92,0.4);font-family:'Courier New',monospace;font-size:32px;letter-spacing:0.5em;color:#e2c994;font-weight:600;">
                    ${code}
                  </span>
                </div>
                <p style="margin:32px 0 0 0;color:#8a7e62;font-size:12px;line-height:1.8;text-align:center;letter-spacing:0.04em;">
                  若你沒有要求重設密碼,請忽略此郵件 ─ 你的密碼不會被改動。
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px;text-align:center;border-top:1px solid rgba(201,163,92,0.18);">
                <p style="margin:0;color:#6e6450;font-size:11px;letter-spacing:0.2em;">
                  crystalfield101.com
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}
