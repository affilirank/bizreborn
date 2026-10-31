#!/usr/bin/env node
/**
 * Create the Stripe recurring checkout for the Edge Cloud Hosting &
 * System Maintenance plan, render the branded Merit Media & Marketing email,
 * and (only with --send) deliver it.
 *
 * Usage:
 *   node scripts/edge-hosting-offer/send.mjs                 # dry run, builds preview
 *   node scripts/edge-hosting-offer/send.mjs --send          # creates Stripe link + sends
 *   node scripts/edge-hosting-offer/send.mjs --send --to Support@SalesGodCRM.com --name Robert
 *
 * Required for live checkout:
 *   STRIPE_SECRET_KEY        Stripe secret key (sk_live_… or sk_test_…)
 *   or STRIPE_CHECKOUT_URL   an existing Payment Link / Checkout URL
 *   or STRIPE_PRICE_ID       an existing recurring $49/month price
 *
 * Required for sending:
 *   RESEND_API_KEY           preferred
 *   EMAIL_FROM               e.g. "Merit Media & Marketing, LLC <hello@meritmarketingfl.com>"
 *   REPLY_TO_EMAIL           defaults to meritmediamarketingfl@gmail.com
 *   — or SMTP_HOST / SMTP_USER / SMTP_PASS (nodemailer fallback)
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { BRAND, OFFER, renderEmail, renderText } from "./render.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  return value && !value.startsWith("--") ? value : true;
}

const dryRun = !process.argv.includes("--send");
const to = String(arg("to", "Support@SalesGodCRM.com"));
const firstName = String(arg("name", "Robert"));
const businessName = String(arg("business", "SalesGodCRM"));
const subject = String(
  arg("subject", `Your ${OFFER.name} plan — ${OFFER.priceLabel}/month`),
);
const checkoutOverride = arg("checkout-url", process.env.STRIPE_CHECKOUT_URL);
const outFile = path.resolve(
  __dirname,
  String(arg("out", "../../dist/edge-hosting-offer-preview.html")),
);

/* -------------------------------------------------------------------------- */
/* Stripe                                                                     */
/* -------------------------------------------------------------------------- */

const STRIPE_API = "https://api.stripe.com/v1";

async function stripe(pathname, params, idempotencyKey) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");

  const body = new URLSearchParams();
  for (const [param, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    body.append(param, String(value));
  }

  const res = await fetch(`${STRIPE_API}/${pathname}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Stripe ${pathname} failed (HTTP ${res.status}): ${
        data?.error?.message ?? JSON.stringify(data)
      }`,
    );
  }
  return data;
}

async function getStripe(pathname) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  const res = await fetch(`${STRIPE_API}/${pathname}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Stripe ${pathname} failed (HTTP ${res.status}): ${
        data?.error?.message ?? JSON.stringify(data)
      }`,
    );
  }
  return data;
}

async function resolveCheckoutUrl() {
  if (checkoutOverride) {
    return { url: String(checkoutOverride), source: "STRIPE_CHECKOUT_URL" };
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      url: "https://checkout.stripe.com/c/pay/REPLACE_WITH_LIVE_LINK",
      source: "placeholder (no Stripe key)",
      placeholder: true,
    };
  }

  let priceId = process.env.STRIPE_PRICE_ID;

  if (priceId) {
    const price = await getStripe(`prices/${encodeURIComponent(priceId)}`);
    const matches =
      price.unit_amount === OFFER.priceCents &&
      price.currency === OFFER.currency &&
      price.recurring?.interval === OFFER.interval;
    if (!matches) {
      throw new Error(
        `STRIPE_PRICE_ID ${priceId} is ${price.unit_amount} ${price.currency}/${price.recurring?.interval}, ` +
          `expected ${OFFER.priceCents} ${OFFER.currency}/${OFFER.interval}. ` +
          `Unset it to create the correct price automatically.`,
      );
    }
    console.log(`Using existing Stripe price ${priceId}.`);
  } else {
    const product = await stripe(
      "products",
      {
        name: OFFER.name,
        description:
          "Edge CDN hosting, SSL management, Supabase database & storage backups, 99.9% uptime monitoring, and routine copy updates.",
        "metadata[plan]": OFFER.slug,
        "metadata[brand]": BRAND.legalName,
        "metadata[list_price]": OFFER.listPriceCents,
        "metadata[client_discount]": OFFER.listPriceCents - OFFER.priceCents,
      },
      `merit-${OFFER.slug}-product-v1`,
    );

    const price = await stripe(
      "prices",
      {
        product: product.id,
        currency: OFFER.currency,
        unit_amount: OFFER.priceCents,
        "recurring[interval]": OFFER.interval,
        nickname: `${OFFER.name} — ${OFFER.priceLabel}/mo client rate`,
        "metadata[plan]": OFFER.slug,
        "metadata[list_price]": OFFER.listPriceCents,
        "metadata[client_discount]": OFFER.listPriceCents - OFFER.priceCents,
      },
      `merit-${OFFER.slug}-price-${OFFER.priceCents}-${OFFER.interval}-v1`,
    );
    priceId = price.id;
    console.log(`Created Stripe product ${product.id} and price ${priceId}.`);
  }

  const link = await stripe(
    "payment_links",
    {
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": 1,
      "after_completion[type]": "redirect",
      "after_completion[redirect][url]": `${BRAND.site}/?hosting=welcome`,
      "billing_address_collection": "auto",
      "metadata[plan]": OFFER.slug,
      "metadata[recipient]": to,
      "metadata[business]": businessName,
    },
    `merit-${OFFER.slug}-link-${to.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-v1`,
  );

  return { url: link.url, source: `Stripe Payment Link ${link.id}` };
}

/* -------------------------------------------------------------------------- */
/* Email                                                                      */
/* -------------------------------------------------------------------------- */

const FROM =
  process.env.EMAIL_FROM || `${BRAND.legalName} <hello@meritmediafl.com>`;
const REPLY_TO = process.env.REPLY_TO_EMAIL || BRAND.email;

async function sendWithResend({ html, text }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      reply_to: REPLY_TO,
      subject,
      html,
      text,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Resend failed (HTTP ${res.status}): ${data?.message ?? JSON.stringify(data)}`,
    );
  }
  return { provider: "resend", id: data?.id };
}

async function sendWithSmtp({ html, text }) {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  let nodemailer;
  try {
    nodemailer = (await import("nodemailer")).default;
  } catch {
    throw new Error(
      "SMTP is configured but nodemailer is not installed. Run `npm install` in the project root.",
    );
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  const sent = await transport.sendMail({
    from: process.env.SMTP_FROM || FROM,
    to,
    replyTo: REPLY_TO,
    subject,
    html,
    text,
  });
  return { provider: "smtp", id: sent?.messageId };
}

/* -------------------------------------------------------------------------- */
/* Run                                                                        */
/* -------------------------------------------------------------------------- */

async function main() {
  console.log(`\n${BRAND.legalName} — ${OFFER.name}`);
  console.log(`Recipient: ${firstName} <${to}>`);
  console.log(`Price: ${OFFER.priceLabel} / ${OFFER.interval}\n`);

  let checkout;
  try {
    checkout = await resolveCheckoutUrl();
  } catch (error) {
    console.error(`\nStripe error: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Checkout: ${checkout.url}  (${checkout.source})`);

  const emailOpts = {
    checkoutUrl: checkout.url,
    firstName,
    businessName,
    recipientEmail: to,
  };
  const html = renderEmail(emailOpts);
  const text = renderText(emailOpts);

  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, html, "utf8");
  console.log(`Preview:  ${path.relative(process.cwd(), outFile)}`);

  if (dryRun) {
    console.log(
      "\nDRY RUN — nothing was sent. Re-run with --send to deliver this email.\n",
    );
    return;
  }

  if (checkout.placeholder) {
    console.error(
      "\nRefusing to send: no real Stripe checkout URL. Set STRIPE_SECRET_KEY, STRIPE_CHECKOUT_URL, or STRIPE_PRICE_ID.\n",
    );
    process.exitCode = 1;
    return;
  }

  try {
    const result =
      (await sendWithResend({ html, text })) ??
      (await sendWithSmtp({ html, text }));

    if (!result) {
      console.error(
        "\nNo email provider configured. Set RESEND_API_KEY, or SMTP_HOST/SMTP_USER/SMTP_PASS.\n",
      );
      process.exitCode = 1;
      return;
    }

    console.log(`\nSent via ${result.provider}${result.id ? ` (id: ${result.id})` : ""}.`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}\n`);
  } catch (error) {
    console.error(`\nSend failed: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
