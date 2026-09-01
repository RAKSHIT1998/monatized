// Dynamic content embedded in these templates (creator display names,
// product titles) is creator-controlled free text, not markup — escape it
// before interpolation so it can't break the surrounding HTML structure.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// A minimal branded HTML wrapper — no external assets or fonts, just enough
// structure that an email client renders something better than a wall of
// plain text. Used sparingly (order confirmation, order recovery), not
// every send in the app — see the "not touched" scope note where it's used.
export function renderEmailLayout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#171717;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:12px;border:1px solid #e5e5e5;">
            <tr>
              <td style="padding:24px 28px 8px;">
                <p style="margin:0;font-size:15px;font-weight:600;letter-spacing:-0.01em;">Monetized</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 28px;">
                <h1 style="margin:0 0 16px;font-size:18px;font-weight:600;">${title}</h1>
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
