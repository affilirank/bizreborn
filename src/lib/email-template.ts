import { SITE, LEADGEN } from "@/lib/config";
import type { Prospect } from "@/lib/supabase-types";

/** Who actually signs Biz Reborn outreach (placeholder-proof sign-off). */
export const OUTREACH_SIGNER = {
  name: "Daniel Brown",
  title: "Lead Growth Specialist",
};

const PLACEHOLDER_RE = /\[([^\]\n]{1,40})\]/gi;

const STANDARD_REPLACEMENTS: Record<string, string> = {
  "your name": OUTREACH_SIGNER.name,
  "your full name": OUTREACH_SIGNER.name,
  "insert your name": OUTREACH_SIGNER.name,
  "insert name": OUTREACH_SIGNER.name,
  "sender name": OUTREACH_SIGNER.name,
  "signer name": OUTREACH_SIGNER.name,
  name: OUTREACH_SIGNER.name,
  "your company": SITE.name,
  "your company name": SITE.name,
  company: SITE.name,
  "company name": SITE.name,
  "agency name": SITE.name,
  agency: SITE.name,
  "your brand": SITE.name,
  "your email": LEADGEN.email,
  "your email address": LEADGEN.email,
  "email address": LEADGEN.email,
  email: LEADGEN.email,
  phone: SITE.phone,
  "phone number": SITE.phone,
  "your phone": SITE.phone,
  "phone #": SITE.phone,
  "your site": "https://www.bizreborn.com",
  website: "https://www.bizreborn.com",
  "your website": "https://www.bizreborn.com",
  "website link": "https://www.bizreborn.com",
};

/**
 * Scrubs outreach copy for LLM placeholder leaks (`[Your Name]`,
 * `[Company]`, `[link]`, …) and fills them with the real values, so no
 * email or pitch copy ever ships with a dangling bracket. Runs as a
 * backstop on every outbound email (AI-generated or hand-written).
 */
export function sanitizeOutreachCopy(text: string, prospect?: Prospect | null): string {
  if (!text) return text;
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bizreborn.com";
  const pitchUrl = `${base}/pitch/${prospect?.slug ?? ""}`;

  const perProspect: Record<string, string> = {
    link: pitchUrl,
    "your link": pitchUrl,
    "insert link": pitchUrl,
    "pitch link": pitchUrl,
    "audit link": pitchUrl,
    "video link": pitchUrl,
    "video audit link": pitchUrl,
    business: prospect?.business_name ?? "your business",
    "business name": prospect?.business_name ?? "your business",
    "your business": prospect?.business_name ?? "your business",
    "your business name": prospect?.business_name ?? "your business",
    city: prospect?.city || "your city",
    "your city": prospect?.city || "your city",
  };

  const map: Record<string, string> = { ...STANDARD_REPLACEMENTS, ...perProspect };

  return text.replace(PLACEHOLDER_RE, (full, inner: string) => {
    const key = inner.trim().toLowerCase().replace(/\s+/g, " ");
    return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : full;
  });
}

interface EmailTemplateProps {
  prospect: Prospect;
  subject: string;
  body: string;
  stepNumber: number;
}

/**
 * Generates a professional, responsive HTML email matching the agency's
 * branding (logo, brand colors, CTA button, pitch video link, and footer).
 */
export function renderProfessionalEmailHtml(props: EmailTemplateProps): string {
  const { prospect, subject, body, stepNumber } = props;
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bizreborn.com";
  const pitchUrl = `${base}/pitch/${prospect.slug ?? ""}`;
  const agencyName = SITE.name;
  const agencyEmail = LEADGEN.email;
  const agencyPhone = SITE.phone;

  // Format body paragraphs into clean HTML paragraphs
  const formattedBody = body
    .split(/\n\n+/)
    .map((p) => `<p style="margin:0 0 16px 0;line-height:1.6;color:#334155;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);border:1px solid #e2e8f0;">
          
          <!-- Header with Logo / Brand -->
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
                      Step ${stepNumber} of 3 · Custom Growth Nurture
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:40px 36px 24px 36px;">
              <p style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6366F1;font-weight:700;margin:0 0 12px 0;">
                Prepared for ${prospect.business_name} (${prospect.city || "Local Market"})
              </p>
              <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 20px 0;line-height:1.3;">
                ${subject}
              </h1>

              <div style="font-size:15px;color:#334155;">
                ${formattedBody}
              </div>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:32px 0 24px 0;" width="100%">
                <tr>
                  <td align="center">
                    <a href="${pitchUrl}" target="_blank" style="background:linear-gradient(135deg, #6366F1 0%, #4f46e5 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:bold;font-size:15px;display:inline-block;box-shadow:0 4px 14px rgba(99,102,241,0.4);">
                      Watch Your 45-Second Video Audit →
                    </a>
                  </td>
                </tr>
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
                You are receiving this because we prepared a complimentary local growth audit for ${prospect.business_name}. <a href="${base}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
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
