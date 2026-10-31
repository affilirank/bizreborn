/**
 * Branded transactional email for the Edge Cloud Hosting & System Maintenance
 * recurring plan ($49.00 / month), sent on behalf of Merit Media & Marketing, LLC.
 *
 * Pure functions only — no dependencies, no I/O. `send.mjs` supplies the live
 * Stripe checkout URL and the recipient details.
 */

export const OFFER = {
  slug: "edge-cloud-hosting",
  name: "Edge Cloud Hosting & System Maintenance",
  priceCents: 4900,
  currency: "usd",
  interval: "month",
  priceLabel: "$49.00",
  listPriceCents: 15000,
  listPriceLabel: "$150.00",
  discountLabel: "over $100/mo off",
};

export const BRAND = {
  legalName: "Merit Media & Marketing, LLC",
  shortName: "Merit Media & Marketing",
  site: "https://www.meritmediafl.com",
  logo: "https://www.meritmediafl.com/images/merit-logo.png",
  email: "meritmediamarketingfl@gmail.com",
  phone: "(772) 290-1756",
  phoneHref: "+17722901756",
  signer: "Daniel Brown",
  signerTitle: "Lead Growth Specialist",
  ink: "#0B0F17",
  gold: "#B08A3E",
  goldDeep: "#8A6423",
  cream: "#F6F0E4",
  paper: "#FBFAF7",
  body: "#3D3A34",
  muted: "#706B61",
  rule: "#E7DFD1",
};

const esc = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const FEATURES = [
  {
    title: "High-speed Edge CDN hosting",
    detail:
      "Your site is delivered from edge locations closest to each visitor, so SalesGodCRM stays fast everywhere it is opened.",
  },
  {
    title: "SSL security management",
    detail:
      "Certificates are issued, renewed, and monitored for you — login and checkout pages always load over a secure connection.",
  },
  {
    title: "Supabase database & storage backups",
    detail:
      "Scheduled backups of your Supabase database and storage, with restore support if anything is ever lost or corrupted.",
  },
  {
    title: "99.9% uptime monitoring",
    detail:
      "Around-the-clock monitoring with immediate alerts, so problems are caught and resolved before your customers notice.",
  },
  {
    title: "Routine copy updates",
    detail:
      "Ongoing text and content changes handled for you, keeping offers, pages, and messaging current without a dev ticket.",
  },
];

/**
 * @param {object} opts
 * @param {string} opts.checkoutUrl  Live Stripe Payment Link / Checkout URL.
 * @param {string} [opts.firstName]  Recipient first name.
 * @param {string} [opts.businessName]
 * @param {string} [opts.recipientEmail]
 */
export function renderEmail(opts) {
  const {
    checkoutUrl,
    firstName = "Robert",
    businessName = "SalesGodCRM",
    recipientEmail = "Support@SalesGodCRM.com",
  } = opts;

  if (!checkoutUrl) throw new Error("checkoutUrl is required");

  const safeFirst = esc(firstName);
  const safeBusiness = esc(businessName);
  const safeRecipient = esc(recipientEmail);
  const href = esc(checkoutUrl);

  const featureRows = FEATURES.map(
    (feature, index) => `
              <tr>
                <td width="34" valign="top" style="padding:${index === 0 ? "0" : "18px"} 0 0 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="24" height="24" align="center" valign="middle" style="width:24px;height:24px;background-color:${BRAND.cream};border:1px solid #E3D3AE;border-radius:12px;color:${BRAND.goldDeep};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:24px;font-weight:bold;">&#10003;</td>
                    </tr>
                  </table>
                </td>
                <td valign="top" style="padding:${index === 0 ? "0" : "18px"} 0 0 12px;">
                  <p style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.4;font-weight:bold;color:${BRAND.ink};">${esc(feature.title)}</p>
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:${BRAND.muted};">${esc(feature.detail)}</p>
                </td>
              </tr>`,
  ).join("");

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Your Edge Cloud Hosting plan — ${BRAND.legalName}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width:620px) {
      .wrap { width:100% !important; }
      .pad { padding-left:24px !important; padding-right:24px !important; }
      .h1 { font-size:26px !important; line-height:1.2 !important; }
      .price-cell { display:block !important; width:100% !important; text-align:left !important; padding:0 !important; }
      .price-amount { padding-top:10px !important; text-align:left !important; }
      .btn { width:100% !important; }
    }
    a { -webkit-text-size-adjust:none; }
    table { border-collapse:collapse; }
    img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  </style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#F0ECE4;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    A $49/month plan that keeps ${safeBusiness} fast, secure, backed up, and online — with hosting, SSL, Supabase backups, uptime monitoring, and copy updates handled for you.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F0ECE4;">
    <tr>
      <td align="center" style="padding:32px 12px;">

        <table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#FFFFFF;border:1px solid #E3DACB;border-radius:16px;overflow:hidden;">

          <!-- Brand bar -->
          <tr>
            <td align="center" style="background-color:${BRAND.ink};padding:26px 24px 22px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:10px;">
                    <img src="${BRAND.logo}" width="64" height="64" alt="${BRAND.legalName}" style="display:block;width:64px;height:64px;border-radius:12px;">
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.3;letter-spacing:0.06em;color:#FFFFFF;text-transform:uppercase;">
                    ${BRAND.shortName}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:6px;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.3;letter-spacing:0.22em;color:${BRAND.gold};text-transform:uppercase;">
                    Web · Media · Growth
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td height="4" style="height:4px;line-height:4px;font-size:0;background-color:${BRAND.gold};">&nbsp;</td></tr>

          <!-- Hero -->
          <tr>
            <td class="pad" style="padding:38px 40px 0 40px;">
              <p style="margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.4;letter-spacing:0.18em;text-transform:uppercase;color:${BRAND.goldDeep};font-weight:bold;">
                Hosting &amp; maintenance proposal
              </p>
              <h1 class="h1" style="margin:0 0 18px 0;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.2;font-weight:normal;color:${BRAND.ink};">
                Everything ${safeBusiness} needs to stay fast, secure, and online.
              </h1>
              <p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:${BRAND.body};">
                Hi ${safeFirst},
              </p>
              <p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:${BRAND.body};">
                Thank you for the conversation about keeping ${safeBusiness} running smoothly. Here is the plan we put together: one flat monthly rate that covers the hosting, security, backups, monitoring, and day-to-day updates your site needs.
              </p>
              <p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:${BRAND.body};">
                The regular rate is ${OFFER.listPriceLabel} a month. As a client, yours is <strong style="color:${BRAND.ink};">${OFFER.priceLabel} a month</strong> — ${OFFER.discountLabel}.
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:${BRAND.body};">
                No hourly billing and no surprise invoices — just a site that stays online and up to date.
              </p>
            </td>
          </tr>

          <!-- Price -->
          <tr>
            <td class="pad" style="padding:28px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.paper};border:1px solid #E7DCC7;border-radius:12px;">
                <tr>
                  <td style="padding:22px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td class="price-cell" valign="middle" style="font-family:Arial,Helvetica,sans-serif;">
                          <span style="display:inline-block;margin-bottom:8px;padding:4px 9px;border:1px solid #D9C79E;border-radius:20px;background-color:#F6EEDC;font-size:9px;line-height:1.2;letter-spacing:0.12em;text-transform:uppercase;font-weight:bold;color:${BRAND.goldDeep};">
                            Client rate · ${OFFER.discountLabel}
                          </span>
                          <p style="margin:0 0 4px 0;font-size:15px;line-height:1.4;font-weight:bold;color:${BRAND.ink};">
                            Edge Cloud Hosting &amp; System Maintenance
                          </p>
                          <p style="margin:0;font-size:12px;line-height:1.6;color:${BRAND.muted};">
                            <span style="text-decoration:line-through;color:#9A948A;">${OFFER.listPriceLabel}/mo regular</span>
                            &nbsp;·&nbsp; billed monthly, automatically
                          </p>
                        </td>
                        <td class="price-amount" valign="middle" align="right" style="font-family:Georgia,'Times New Roman',serif;white-space:nowrap;padding-left:18px;">
                          <span style="font-size:34px;line-height:1;color:${BRAND.ink};">${OFFER.priceLabel}</span>
                          <span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.muted};"> / month</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td class="pad" align="center" style="padding:26px 40px 4px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                <tr>
                  <td align="center">
                    <a class="btn" href="${href}" target="_blank" rel="noopener" style="display:inline-block;background-color:${BRAND.goldDeep};color:#FFFFFF;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.2;font-weight:bold;padding:17px 36px;border-radius:10px;">
                      Start the $49/month plan &nbsp;&rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${BRAND.muted};">
                Secure recurring checkout powered by <strong style="color:${BRAND.body};">Stripe</strong>. Your card is billed $49.00 each month until you cancel.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td class="pad" style="padding:26px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:${BRAND.rule};">&nbsp;</td></tr></table>
            </td>
          </tr>

          <!-- What's included -->
          <tr>
            <td class="pad" style="padding:26px 40px 0 40px;">
              <p style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;font-weight:bold;color:${BRAND.goldDeep};">
                What&rsquo;s included
              </p>
              <p style="margin:0 0 20px 0;font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.3;color:${BRAND.ink};">
                One plan. The whole stack handled.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${featureRows}
              </table>
            </td>
          </tr>

          <!-- How it works -->
          <tr>
            <td class="pad" style="padding:30px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.ink};border-radius:12px;">
                <tr>
                  <td style="padding:24px 26px;">
                    <p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;font-weight:bold;color:${BRAND.gold};">
                      What happens next
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="26" valign="top" style="font-family:Georgia,serif;font-size:15px;line-height:1.6;color:${BRAND.gold};">1.</td>
                        <td valign="top" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#D9D4C9;padding-bottom:8px;">
                          <strong style="color:#FFFFFF;">Start checkout.</strong> Add your card on Stripe&rsquo;s secure page — the $49/month plan begins today.
                        </td>
                      </tr>
                      <tr>
                        <td width="26" valign="top" style="font-family:Georgia,serif;font-size:15px;line-height:1.6;color:${BRAND.gold};">2.</td>
                        <td valign="top" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#D9D4C9;padding-bottom:8px;">
                          <strong style="color:#FFFFFF;">We onboard.</strong> We audit the current setup, connect monitoring, and confirm backups are running clean.
                        </td>
                      </tr>
                      <tr>
                        <td width="26" valign="top" style="font-family:Georgia,serif;font-size:15px;line-height:1.6;color:${BRAND.gold};">3.</td>
                        <td valign="top" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#D9D4C9;">
                          <strong style="color:#FFFFFF;">You&rsquo;re covered.</strong> Send copy changes any time; we handle them and keep you posted.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Sign-off -->
          <tr>
            <td class="pad" style="padding:28px 40px 0 40px;">
              <p style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:${BRAND.body};">
                If you have any questions before starting, just reply to this email or call me directly at <a href="tel:${BRAND.phoneHref}" style="color:${BRAND.goldDeep};text-decoration:none;font-weight:bold;">${BRAND.phone}</a>.
              </p>
              <p style="margin:18px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:${BRAND.body};">
                Talk soon,
              </p>
              <p style="margin:6px 0 0 0;font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.4;color:${BRAND.ink};">
                ${BRAND.signer}
              </p>
              <p style="margin:2px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.muted};">
                ${BRAND.signerTitle} · ${BRAND.legalName}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 40px 30px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:${BRAND.rule};">&nbsp;</td></tr>
              </table>
              <p style="margin:18px 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${BRAND.muted};text-align:center;">
                <strong style="color:${BRAND.ink};">${BRAND.legalName}</strong><br>
                Indian River · St. Lucie · Martin · Palm Beach, Florida<br>
                <a href="tel:${BRAND.phoneHref}" style="color:${BRAND.muted};text-decoration:none;">${BRAND.phone}</a> ·
                <a href="mailto:${BRAND.email}" style="color:${BRAND.muted};text-decoration:none;">${BRAND.email}</a> ·
                <a href="${BRAND.site}" target="_blank" rel="noopener" style="color:${BRAND.muted};text-decoration:none;">meritmediafl.com</a>
              </p>
              <p style="margin:10px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#9A948A;text-align:center;">
                Sent to ${safeRecipient} because you requested a hosting and maintenance plan for ${safeBusiness}.<br>
                Not interested? Reply &ldquo;no thanks&rdquo; and we won&rsquo;t follow up.
              </p>
            </td>
          </tr>

        </table>

        <p style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.5;color:#A8A297;text-align:center;">
          &copy; ${new Date().getFullYear()} ${BRAND.legalName}. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Plain-text alternative, for deliverability and text-only clients. */
export function renderText(opts) {
  const {
    checkoutUrl,
    firstName = "Robert",
    businessName = "SalesGodCRM",
    recipientEmail = "Support@SalesGodCRM.com",
  } = opts;

  return [
    `${BRAND.shortName.toUpperCase()}`,
    ``,
    `Hi ${firstName},`,
    ``,
    `Thank you for the conversation about keeping ${businessName} running smoothly. Here is the plan we put together: one flat monthly rate that covers the hosting, security, backups, monitoring, and day-to-day updates your site needs.`,
    ``,
    `EDGE CLOUD HOSTING & SYSTEM MAINTENANCE — ${OFFER.priceLabel} / month`,
    `Client rate (regular ${OFFER.listPriceLabel}/mo — ${OFFER.discountLabel})`,
    ``,
    ...FEATURES.flatMap((feature) => [`• ${feature.title}`, `  ${feature.detail}`, ``]),
    `Start the plan: ${checkoutUrl}`,
    ``,
    `Secure recurring checkout powered by Stripe. Your card is billed ${OFFER.priceLabel} each month until you cancel.`,
    ``,
    `Questions? Reply to this email or call ${BRAND.phone}.`,
    ``,
    `Talk soon,`,
    `${BRAND.signer}`,
    `${BRAND.signerTitle} · ${BRAND.legalName}`,
    ``,
    `---`,
    `${BRAND.legalName} · Indian River · St. Lucie · Martin · Palm Beach, Florida`,
    `${BRAND.phone} · ${BRAND.email} · meritmediafl.com`,
    ``,
    `Sent to ${recipientEmail} because you requested a hosting and maintenance plan for ${businessName}.`,
    `Not interested? Reply "no thanks" and we won't follow up.`,
  ].join("\n");
}
