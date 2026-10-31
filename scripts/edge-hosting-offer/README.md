# Edge Cloud Hosting offer email

Branded Merit Media & Marketing, LLC proposal/checkout email for the
**Edge Cloud Hosting & System Maintenance** plan at **$49.00/month** — a client rate against the **$150.00/month** list price (over $100/month off). The service is cataloged in the builder as module **101** at $150/month; client offers can carry the $49/month recurring term rate.

| File | Purpose |
| --- | --- |
| `render.mjs` | Table-based, responsive HTML email + plain-text alternative |
| `send.mjs` | Creates the Stripe recurring price/payment link, renders, sends |

## Dry run

Builds a local preview and (if a Stripe key is present) resolves the checkout
link without sending anything:

```bash
node scripts/edge-hosting-offer/send.mjs
open dist/edge-hosting-offer-preview.html
```

## Send

```bash
node scripts/edge-hosting-offer/send.mjs --send \
  --to Support@SalesGodCRM.com \
  --name Robert \
  --business SalesGodCRM
```

Only `--send` delivers the email; without it the script never contacts an SMTP
or email API.

## Environment

Set these in `.env.local` (or the shell) — never commit them.

```bash
# Stripe — one of these three
STRIPE_SECRET_KEY=sk_live_...
# STRIPE_PRICE_ID=price_...        # optional: reuse an existing $49/mo price
# STRIPE_CHECKOUT_URL=https://...  # optional: reuse an existing payment link

# Email — Resend (preferred) or SMTP
RESEND_API_KEY=re_...
EMAIL_FROM="Merit Media & Marketing, LLC <hello@meritmarketingfl.com>"
REPLY_TO_EMAIL=meritmediamarketingfl@gmail.com
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=...
# SMTP_PASS=...
```

The `hello@meritmarketingfl.com` From address must live on a domain verified in
Resend (or be the authenticated SMTP account). Replies are directed to
`meritmediamarketingfl@gmail.com`, which is a real mailbox.

## What the Stripe link does

- Creates (or reuses) a product named **Edge Cloud Hosting & System Maintenance**.
- Creates a **$49.00 USD / month** recurring client-rate price (list price metadata: $150.00/mo).
- Creates a reusable **Payment Link** with metadata for the recipient and plan.
- Redirects to `https://www.meritmediafl.com/?hosting=welcome` after payment.
- Charges the first $49.00 immediately, then monthly.

If `STRIPE_PRICE_ID` is supplied, the script verifies that it is a $49.00 USD
monthly price before using it; it will not silently charge a different amount.
