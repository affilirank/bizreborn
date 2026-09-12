import type { Offer } from "@/lib/types";
import { SITE, LEADGEN } from "@/lib/config";

const FROM = () => process.env.EMAIL_FROM || `Biz Reborn Marketing <hello@bizreborn.com>`;
const REPLY_TO = () => process.env.REPLY_TO_EMAIL || "bizrebornmarketing@gmail.com";

export interface EmailResult {
  ok: boolean;
  simulated: boolean;
  error?: string;
}

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

const TERMS = [6, 12, 24] as const;

/** Primary CTA + secondary Stripe button rendered as HTML table buttons. */
function ctaButtons(offer: Offer): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bizreborn.com";
  const reviewUrl = `${base}/offer/${offer.token}`;
  const primary = `
    <td align="center">
      <a href="${reviewUrl}" target="_blank" style="background:linear-gradient(135deg, #6366F1 0%, #4f46e5 100%);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:bold;font-size:15px;display:inline-block;box-shadow:0 4px 14px rgba(99,102,241,0.4);">
        Review Your Proposal →
      </a>
    </td>`;
  const row = (label: string) => `
    <tr><td height="14" style="font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr>
      <td align="center">
        <a href="${reviewUrl}" target="_blank" style="color:#6366F1;text-decoration:underline;font-size:13px;font-weight:600;">${label}</a>
      </td>
    </tr>`;
  if (offer.billingMode === "one-time" && offer.stripePaymentLink) {
    return `
      <tr>${primary}</tr>
      <tr><td height="12" style="font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr>
        <td align="center">
          <a href="${offer.stripePaymentLink}" target="_blank" style="background:#16a34a;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:12px;font-weight:bold;font-size:14px;display:inline-block;">
            Pay ${money(offer.offerPrice)} Secure &amp; Get Started
          </a>
        </td>
      </tr>
      ${row("No payment yet? Review the full proposal first")}`;
  }
  return `
    <tr>${primary}</tr>
    ${row("Choose your 6 / 12 / 24 month plan right on the proposal page")}`;
}

/** Price summary block (one-time or recurring retainer with term rates). */
function priceBlock(offer: Offer): string {
  const strike = (text: string) =>
    `<span style="color:#94a3b8;text-decoration:line-through;">${text}</span>`;
  const badge =
    offer.discountPct > 0
      ? `<span style="display:inline-block;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;border-radius:999px;padding:4px 12px;font-size:12px;font-weight:700;">Save ${offer.discountPct}%</span>`
      : "";

  if (offer.billingMode === "monthly") {
    const termRows = TERMS.map((term) => {
      const rate = offer.monthlyTermPrices[term] ?? offer.monthlyListPrice;
      const savePct =
        offer.monthlyListPrice > rate
          ? Math.round(((offer.monthlyListPrice - rate) / offer.monthlyListPrice) * 100)
          : 0;
      return `
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#334155;">${term}-month plan</td>
          <td align="right" style="padding:8px 0;font-size:14px;">
            ${savePct > 0 ? strike(money(offer.monthlyListPrice) + "/mo") : ""}
            <strong style="color:#0f172a;font-size:16px;">${money(rate)}/mo</strong>
            ${savePct > 0 ? `<span style="color:#15803d;font-weight:700;"> &nbsp;Save ${savePct}%</span>` : ""}
          </td>
        </tr>`;
    }).join("");
    return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:16px 0;">
        <tr>
          <td style="padding:16px 20px 8px 20px;">
            <p style="margin:0 0 4px 0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6366F1;font-weight:700;">Monthly retainer</p>
            <p style="margin:0;font-size:13px;color:#475569;">Regular rate <span style="text-decoration:line-through;color:#94a3b8;">${money(offer.monthlyListPrice)}/mo</span> — choose your commitment term below. ${badge}</p>
          </td>
        </tr>
        <tr><td style="padding:0 20px;">${termRows}</td></tr>
        <tr>
          <td style="padding:8px 20px 16px 20px;font-size:12px;color:#64748b;">
            One-time initiation/setup applies at signup along with your first month. Length of commitment = your discount.
          </td>
        </tr>
      </table>`;
  }

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:16px 0;">
      <tr>
        <td style="padding:20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="font-size:12px;color:#64748b;">Regular price</td>
              <td align="right" style="font-size:12px;color:#64748b;">Your investment</td>
            </tr>
            <tr>
              <td style="padding-top:4px;font-size:18px;font-weight:700;color:#94a3b8;text-decoration:line-through;">${money(offer.listPrice)}</td>
              <td align="right" style="padding-top:4px;font-size:22px;font-weight:800;color:#16a34a;">${money(offer.offerPrice)}</td>
            </tr>
            <tr>
              <td style="padding-top:8px;">${badge}</td>
              <td align="right" style="padding-top:8px;font-size:11px;color:#64748b;">one-time investment</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

/** Renders a branded, responsive proposal email (mirrors the agency's outreach design). */
export function renderOfferEmailHtml(offer: Offer): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bizreborn.com";
  const reviewUrl = `${base}/offer/${offer.token}`;
  const agencyName = SITE.name;
  const agencyEmail = LEADGEN.email;
  const agencyPhone = SITE.phone;

  const serviceRows = offer.serviceTitles
    .map(
      (title) => `
      <tr>
        <td style="padding:7px 0;font-size:14px;color:#334155;vertical-align:top;">
          <span style="color:#16a34a;font-weight:800;">✔</span> &nbsp;${title}
        </td>
      </tr>`,
    )
    .join("");

  const notes = offer.notes
    ? `<tr>
        <td style="padding:16px;background:#eef2ff;border-left:3px solid #6366F1;border-radius:0 8px 8px 0;font-size:13px;color:#3730a3;line-height:1.6;margin:16px 0;">
          ${offer.notes.replace(/\n/g, "<br>")}
        </td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Customized Biz Reborn Proposal — ${offer.clientName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);border:1px solid #e2e8f0;">

          <!-- Header -->
          <tr>
            <td align="center" style="background:linear-gradient(135deg, #0B0F17 0%, #1e1b4b 100%);padding:32px 24px;text-align:center;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;font-family:'Segoe UI',Arial,sans-serif;">
                      ⚡ ${agencyName}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:6px;">
                    <span style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#a5b4fc;">
                      Customized Proposal · ${offer.clientName}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding:40px 36px 24px 36px;">
              <p style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6366F1;font-weight:700;margin:0 0 12px 0;">
                Prepared for ${offer.clientName}
              </p>
              <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 16px 0;line-height:1.3;">
                Your personalized growth plan is ready
              </h1>
              <p style="margin:0 0 16px 0;line-height:1.6;color:#334155;font-size:15px;">
                We built this package around what will move the needle for your business — curated modules, priced for you. Review the full proposal (with your pitch video) using the link below.
              </p>

              <!-- Included services -->
              <p style="margin:24px 0 10px 0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6366F1;font-weight:700;">
                What&apos;s included · ${offer.serviceTitles.length} modules
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 8px 0;">
                ${serviceRows}
              </table>

              ${priceBlock(offer)}
              ${notes}

              <!-- CTA buttons -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 8px 0;" width="100%">
                ${ctaButtons(offer)}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f1f5f9;padding:24px 36px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 8px 0;font-size:13px;font-weight:bold;color:#1e293b;">
                ${agencyName}
              </p>
              <p style="margin:0 0 12px 0;font-size:12px;color:#64748b;">
                Direct: <a href="mailto:${agencyEmail}" style="color:#6366F1;text-decoration:none;">${agencyEmail}</a> · Phone: ${agencyPhone}
              </p>
              <p style="margin:0;font-size:11px;color:#94a3b8;">
                This is a private proposal link — just for ${offer.clientName}. If you have any questions, simply reply to this email.
              </p>
              <p style="margin:8px 0 0 0;font-size:11px;color:#94a3b8;">
                <a href="${reviewUrl}" style="color:#94a3b8;">Open proposal online</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface OfferEmailInput {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(opts: OfferEmailInput): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, simulated: true };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: FROM(),
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        reply_to: REPLY_TO(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, simulated: false };
    return { ok: false, simulated: false, error: data?.message ?? "Resend failed." };
  } catch (err) {
    return {
      ok: false,
      simulated: false,
      error: err instanceof Error ? err.message : "Resend exception",
    };
  }
}

/** Sends the branded proposal email to the client. Never throws (best-effort). */
export async function sendOfferEmail(offer: Offer): Promise<EmailResult> {
  if (!offer.clientEmail) return { ok: false, simulated: false, error: "No client email." };
  const subject = `Your Customized Biz Reborn Proposal — ${offer.clientName}`;
  return sendEmail({
    to: offer.clientEmail,
    subject,
    html: renderOfferEmailHtml(offer),
  });
}