export interface BrandedEmailContent {
  language: string;
  logoUrl: string;
  greeting: string;
  /** Paragraphs of body copy, rendered in order. Plain text, escaped here. */
  paragraphs: string[];
  callToAction?: {
    label: string;
    url: string;
    /** Prefix for the "or copy this link" line under the button. */
    copyLinkPrefix: string;
  };
  signoff: string;
  signoffName: string;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * The shared Walk and Tour email shell.
 *
 * Every transactional email renders through this so a new message is a matter
 * of supplying copy rather than another hand-written table layout. Values are
 * escaped here; callers pass plain text.
 */
export function renderBrandedEmail(content: BrandedEmailContent): string {
  const paragraphs = content.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#3d3124;">${escapeHtml(paragraph)}</p>`,
    )
    .join('\n            ');

  const callToAction = content.callToAction
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
              <tr>
                <td style="border-radius:28px;background-color:#2b666d;text-align:center;">
                  <a href="${escapeHtml(content.callToAction.url)}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(content.callToAction.label)}</a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#627176;text-align:center;word-break:break-all;">
              ${escapeHtml(content.callToAction.copyLinkPrefix)} <a href="${escapeHtml(content.callToAction.url)}" style="color:#2b666d;text-decoration:underline;">${escapeHtml(content.callToAction.url)}</a>
            </p>`
    : '';

  return `<!DOCTYPE html>
<html lang="${escapeHtml(content.language)}">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background-color:#f6f1e7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f1e7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8dfd4;">
        <tr>
          <td style="background-color:#fcfaf7;padding:28px 32px;text-align:center;border-bottom:1px solid #e8dfd4;">
            <img src="${escapeHtml(content.logoUrl)}" alt="Walk and Tour" height="48" style="height:48px;width:auto;"/>
          </td>
        </tr>
        <tr>
          <td style="height:4px;background-color:#2b666d;font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:36px 32px 28px;">
            <p style="margin:0 0 20px;font-size:18px;font-weight:600;color:#2a221a;">${escapeHtml(content.greeting)}</p>
            ${paragraphs}
            ${callToAction}
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 36px;">
            <p style="margin:0 0 4px;font-size:15px;color:#3d3124;">${escapeHtml(content.signoff)}</p>
            <p style="margin:0;font-size:15px;font-weight:600;color:#2b666d;">${escapeHtml(content.signoffName)}</p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#fcfaf7;padding:20px 32px;border-top:1px solid #e8dfd4;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9a8d7e;">&copy; Walk and Tour</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
