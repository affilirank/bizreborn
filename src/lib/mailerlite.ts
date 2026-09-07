const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface MailerLiteResult {
  ok: boolean;
  mode: "live" | "unconfigured" | "error";
  error?: string;
}

/**
 * Subscribe a contact to MailerLite using the same integration as the
 * blessed-barbershop project (connect.mailerlite.com API, Bearer token).
 *
 * Autoresponder: MailerLite fires the automation / auto-responder sequence
 * attached to a group whenever a subscriber is added to it, so point
 * MAILERLITE_GROUP_ID at the group that owns your welcome sequence.
 */
export async function subscribeToMailerLite(
  email: string,
  opts: {
    fullName?: string;
    businessName?: string;
    phone?: string;
  } = {},
): Promise<MailerLiteResult> {
  const apiKey = process.env.MAILERLITE_API_KEY;
  if (!apiKey) {
    return { ok: false, mode: "unconfigured" };
  }

  const clean = email.trim().toLowerCase();
  if (!EMAIL_RE.test(clean)) {
    return { ok: false, mode: "error", error: "Invalid email." };
  }

  try {
    const fields: Record<string, string> = {};
    if (opts.fullName) fields.name = opts.fullName;
    if (opts.businessName) fields.business = opts.businessName;
    if (opts.phone) fields.phone = opts.phone;

    const body: Record<string, unknown> = {
      email: clean,
      resubscribe: true,
    };
    if (Object.keys(fields).length > 0) body.fields = fields;

    const groupId = process.env.MAILERLITE_GROUP_ID;
    if (groupId) body.groups = [groupId];

    const res = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("MailerLite subscribe error", res.status, text);
      return { ok: false, mode: "error", error: `HTTP ${res.status}` };
    }
    return { ok: true, mode: "live" };
  } catch (err) {
    console.error("MailerLite subscribe exception", err);
    return { ok: false, mode: "error", error: "Network failure." };
  }
}
