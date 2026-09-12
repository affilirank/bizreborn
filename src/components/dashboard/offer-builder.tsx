"use client";

import * as React from "react";
import {
  BadgePercent,
  Check,
  CheckCircle2,
  Copy,
  DollarSign,
  ExternalLink,
  Film,
  Loader2,
  Mail,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  createOffer,
  deleteOffer,
  listOffers,
  updateOfferStatus,
} from "@/lib/data";
import { ALL_SERVICES, PILLARS } from "@/data/services";
import type { Offer } from "@/lib/types";
import { PREFILL_KEY, type OfferPrefill } from "@/lib/offer-prefill";
import { cn } from "@/lib/utils";

const PILLAR_NAME: Record<string, string> = Object.fromEntries(
  PILLARS.map((p) => [p.id, p.name]),
);

const STATUS_STYLE: Record<Offer["status"], string> = {
  draft: "border-brand-500/30 bg-brand-500/10 text-brand-300",
  sent: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  paid: "border-glow-500/30 bg-glow-500/10 text-glow-400",
  declined: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function OfferBuilder() {
  const [offers, setOffers] = React.useState<Offer[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [clientName, setClientName] = React.useState("");
  const [clientEmail, setClientEmail] = React.useState("");
  const [selected, setSelected] = React.useState<number[]>([]);
  const [offerPrice, setOfferPrice] = React.useState("");
  const [billingMode, setBillingMode] = React.useState<"one-time" | "monthly">("one-time");
  const [termPrices, setTermPrices] = React.useState<Record<number, string>>({
    6: "",
    12: "",
    24: "",
  });
  const [notes, setNotes] = React.useState("");
  const [videoUrl, setVideoUrl] = React.useState("");
  const [prospectId, setProspectId] = React.useState<string | null>(null);
  const [prefilled, setPrefilled] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [created, setCreated] = React.useState<Offer | null>(null);
  const [copiedToken, setCopiedToken] = React.useState<string | null>(null);
  const [busyToken, setBusyToken] = React.useState<string | null>(null);
  const [sendingId, setSendingId] = React.useState<string | null>(null);
  const [sentId, setSentId] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    void listOffers()
      .then((rows) => {
        setOffers(rows);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));

    // "Draft proposal" on Lead Pitches drops a prefill here.
    try {
      const raw = sessionStorage.getItem(PREFILL_KEY);
      if (raw) {
        sessionStorage.removeItem(PREFILL_KEY);
        const pre = JSON.parse(raw) as OfferPrefill;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setClientName(pre.clientName ?? "");
        setClientEmail(pre.clientEmail ?? "");
        setSelected((pre.services ?? []).filter((id) => ALL_SERVICES.some((s) => s.id === id)));
        setNotes(pre.notes ?? "");
        setVideoUrl(pre.videoUrl ?? "");
        setProspectId(pre.prospectId ?? null);
        setPrefilled(true);
      }
    } catch {
      /* ignore malformed prefill */
    }
  }, []);

  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const listTotal = selected.reduce(
    (s, id) => s + (ALL_SERVICES.find((x) => x.id === id)?.oneTime ?? 0) + (ALL_SERVICES.find((x) => x.id === id)?.monthly ?? 0),
    0,
  );
  const oneTimeTotal = selected.reduce(
    (s, id) => s + (ALL_SERVICES.find((x) => x.id === id)?.oneTime ?? 0),
    0,
  );
  const monthlyListTotal = selected.reduce(
    (s, id) => s + (ALL_SERVICES.find((x) => x.id === id)?.monthly ?? 0),
    0,
  );
  const parsedTermPrices: Partial<Record<number, number>> = {};
  for (const term of [6, 12, 24]) {
    const value = Math.round(Number(termPrices[term]));
    if (Number.isFinite(value) && value > 0) parsedTermPrices[term] = value;
  }
  const finalPrice = Number(offerPrice) || listTotal;
  const term12Rate = parsedTermPrices[12] ?? monthlyListTotal;
  const shownPrice = billingMode === "monthly" ? term12Rate : finalPrice;
  const shownList = billingMode === "monthly" ? monthlyListTotal : listTotal;
  const discountPct =
    shownList > shownPrice
      ? Math.round(((shownList - shownPrice) / shownList) * 100)
      : 0;

  const resetForm = () => {
    setClientName("");
    setClientEmail("");
    setSelected([]);
    setOfferPrice("");
    setBillingMode("one-time");
    setTermPrices({ 6: "", 12: "", 24: "" });
    setNotes("");
    setVideoUrl("");
    setProspectId(null);
    setPrefilled(false);
    setCreated(null);
  };

  const handleCreate = async () => {
    setError("");
    if (!clientName.trim() || selected.length === 0) {
      setError("Add a client name and pick at least one service.");
      return;
    }
    setCreating(true);
    try {
      const offer = await createOffer({
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        services: selected,
        offerPrice: billingMode === "monthly" ? term12Rate : finalPrice,
        notes: notes.trim(),
        videoUrl: videoUrl.trim() || null,
        prospectId,
        billingMode,
        monthlyTermPrices: parsedTermPrices,
      });
      setCreated(offer);
      setOffers((prev) => [offer, ...prev]);
      setClientName("");
      setClientEmail("");
      setSelected([]);
      setOfferPrice("");
      setBillingMode("one-time");
      setTermPrices({ 6: "", 12: "", 24: "" });
      setNotes("");
      setVideoUrl("");
      setProspectId(null);
      setPrefilled(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the offer.");
    } finally {
      setCreating(false);
    }
  };

  const handlePaymentLink = async (offer: Offer) => {
    setBusyToken(offer.id);
    try {
      const res = await fetch(`/api/offers/${offer.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "payment-link" }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.url) {
        const withLink = { ...offer, stripePaymentLink: json.url as string, status: "sent" as const };
        setOffers((prev) => prev.map((o) => (o.id === offer.id ? withLink : o)));
        setCreated((prev) => (prev?.id === offer.id ? withLink : prev));
        await copyText(json.url);
        setCopiedToken(offer.id);
      } else {
        setError(json?.error ?? "Could not generate the payment link.");
      }
    } finally {
      setBusyToken(null);
    }
  };

  const handleSend = async (offer: Offer) => {
    setError("");
    if (!offer.clientEmail) {
      setError("Add a client email to send the proposal.");
      return;
    }
    setSendingId(offer.id);
    try {
      const res = await fetch(`/api/offers/${offer.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send" }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        const sent = {
          ...offer,
          status: "sent" as const,
          stripePaymentLink:
            (json.paymentLink as string | null) ?? offer.stripePaymentLink,
        };
        setOffers((prev) => prev.map((o) => (o.id === offer.id ? sent : o)));
        setCreated((prev) => (prev?.id === offer.id ? sent : prev));
        setSentId(offer.id);
        window.setTimeout(() => setSentId(null), 2500);
      } else if (json?.simulated) {
        setError("Email service isn't configured — the proposal link is copied instead.");
        await copyOfferLink(offer);
      } else {
        setError(json?.error ?? "Could not send the proposal email.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the proposal email.");
    } finally {
      setSendingId(null);
    }
  };

  const copyOfferLink = async (offer: Offer) => {
    const ok = await copyText(`${window.location.origin}/offer/${offer.token}`);
    if (ok) {
      setCopiedToken(offer.id);
      window.setTimeout(() => setCopiedToken(null), 2000);
    }
  };

  const setStatus = (offer: Offer, status: Offer["status"]) => {
    setOffers((prev) => prev.map((o) => (o.id === offer.id ? { ...o, status } : o)));
    void updateOfferStatus(offer.id, status).catch(() => {});
  };

  const removeOffer = (offer: Offer) => {
    setOffers((prev) => prev.filter((o) => o.id !== offer.id));
    if (offer.status !== "paid") void deleteOffer(offer.id).catch(() => {});
  };

  const toggleAll = (groupIds: number[]) => {
    const allOn = groupIds.every((id) => selected.includes(id));
    setSelected((prev) =>
      allOn
        ? prev.filter((id) => !groupIds.includes(id))
        : Array.from(new Set([...prev, ...groupIds])),
    );
  };

  const groups = PILLARS.map((p) => ({
    pillar: p,
    services: ALL_SERVICES.filter((s) => s.pillar === p.id),
  }));

  return (
    <div className="space-y-6">
      {/* Builder */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-white/8 bg-ink-850/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-white">Compose a proposal</h3>
              <p className="text-xs text-fog">
                Pick modules, set your price &amp; discount, add comments — saved as a draft until you send it.
              </p>
            </div>
            {selected.length > 0 && (
              <button
                onClick={resetForm}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-fog transition hover:border-white/25 hover:text-white"
              >
                <X className="h-3.5 w-3.5" /> Reset
              </button>
            )}
          </div>

          {prefilled && (
            <p className="mt-4 flex items-center gap-2 rounded-xl border border-glow-500/30 bg-glow-500/10 px-4 py-2.5 text-xs text-glow-300">
              <Film className="h-3.5 w-3.5 shrink-0" />
              Pre-filled from the lead audit — the recommended modules are selected and the pitch video is
              attached. Adjust the price for a discount, add comments, then save the draft.
            </p>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Client name (e.g. Ace Plumbing)"
              className="rounded-xl border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white placeholder:text-mute outline-none transition focus:border-brand-400/60"
            />
            <input
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="client@business.com"
              type="email"
              className="rounded-xl border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white placeholder:text-mute outline-none transition focus:border-brand-400/60"
            />
          </div>

          <div className="mt-4 max-h-[300px] space-y-4 overflow-y-auto pr-1">
            {groups.map(({ pillar, services }) => {
              const groupIds = services.map((s) => s.id);
              const on = groupIds.every((id) => selected.includes(id));
              const some = groupIds.some((id) => selected.includes(id));
              return (
                <div key={pillar.id} className="rounded-xl border border-white/5 bg-ink-800/30 p-3">
                  <button
                    onClick={() => toggleAll(groupIds)}
                    className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-fog"
                  >
                    <span>{PILLAR_NAME[pillar.id] ?? pillar.name}</span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px]",
                        on
                          ? "border-glow-500/40 bg-glow-500/10 text-glow-400"
                          : some
                            ? "border-brand-500/40 bg-brand-500/10 text-brand-300"
                            : "border-white/10 text-mute",
                      )}
                    >
                      {on ? "All selected" : some ? "Some selected" : `${services.length} services`}
                    </span>
                  </button>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {services.map((s) => {
                      const isOn = selected.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => toggle(s.id)}
                          className={cn(
                            "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition",
                            isOn
                              ? "border-brand-400/50 bg-brand-500/15 text-white"
                              : "border-white/5 bg-ink-900/40 text-fog hover:border-white/20",
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate">{s.title}</span>
                          <span className="shrink-0 text-mute">
                            {s.oneTime + s.monthly > 0
                              ? `$${(s.oneTime + s.monthly).toLocaleString()}`
                              : "—"}
                          </span>
                          {isOn && <Check className="h-3.5 w-3.5 shrink-0 text-glow-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex w-fit items-center rounded-xl border border-white/10 bg-ink-800 p-1">
            <button
              onClick={() => setBillingMode("one-time")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                billingMode === "one-time"
                  ? "bg-brand-500 text-white"
                  : "text-fog hover:text-white",
              )}
            >
              One-time
            </button>
            <button
              onClick={() => setBillingMode("monthly")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                billingMode === "monthly"
                  ? "bg-brand-500 text-white"
                  : "text-fog hover:text-white",
              )}
            >
              Recurring retainer
            </button>
          </div>

          {billingMode === "one-time" ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1.4fr]">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mute">
                  Offer price (USD)
                </span>
                <input
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder={String(listTotal || "0")}
                  inputMode="numeric"
                  className="w-full rounded-xl border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white placeholder:text-mute outline-none transition focus:border-brand-400/60"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mute">
                  Pitch video / audit link (optional)
                </span>
                <input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.bizreborn.com/pitch/… or an .mp4"
                  className="w-full rounded-xl border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white placeholder:text-mute outline-none transition focus:border-brand-400/60"
                />
              </label>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-brand-500/20 bg-brand-500/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-300">
                Recurring retainer — set discounted monthly rates per term
              </p>
              <p className="mt-1.5 text-xs text-fog">
                Initiation/setup of{" "}
                <span className="font-semibold text-white">
                  ${oneTimeTotal.toLocaleString()}
                </span>{" "}
                is charged once at signup, then the monthly rate repeats for the
                client&apos;s chosen commitment term. Listed monthly rate:{" "}
                <span className="font-semibold text-white">
                  ${monthlyListTotal.toLocaleString()}/mo
                </span>
                . Leave a term blank to charge list rate for that term.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[6, 12, 24].map((term) => {
                  const rate = Number(termPrices[term]);
                  const parsed = Number.isFinite(rate) && rate > 0 ? rate : null;
                  const savePct =
                    parsed && monthlyListTotal > parsed
                      ? Math.round(((monthlyListTotal - parsed) / monthlyListTotal) * 100)
                      : 0;
                  return (
                    <label key={term} className="block">
                      <span className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-mute">
                        <span>{term}-month</span>
                        {savePct > 0 && (
                          <span className="text-glow-400">-{savePct}%</span>
                        )}
                      </span>
                      <input
                        value={termPrices[term]}
                        onChange={(e) =>
                          setTermPrices((prev) => ({
                            ...prev,
                            [term]: e.target.value.replace(/[^0-9]/g, ""),
                          }))
                        }
                        placeholder={String(monthlyListTotal || "0")}
                        inputMode="numeric"
                        className="w-full rounded-xl border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white placeholder:text-mute outline-none transition focus:border-brand-400/60"
                      />
                      <span className="mt-1 block truncate text-[10px] text-mute">
                        {parsed
                          ? `${(parsed * term).toLocaleString()} total over term`
                          : "list rate"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <label className="mt-3 block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mute">
              Comments for the client (optional)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder='e.g. "50% off to celebrate your new location — this covers the three gaps we found in your audit."'
              className="w-full resize-y rounded-xl border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white placeholder:text-mute outline-none transition focus:border-brand-400/60"
            />
          </label>

          {error && (
            <p className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300">
              {error}
            </p>
          )}

          <button
            onClick={handleCreate}
            disabled={creating || selected.length === 0}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Creating…
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Save proposal draft
              </>
            )}
          </button>
        </div>

        {/* Live preview */}
        <div className="h-fit rounded-2xl border border-white/8 bg-ink-850/50 p-5">
          <h3 className="font-display text-base font-bold text-white">Proposal preview</h3>
          <div className="mt-4 rounded-2xl border border-white/5 bg-ink-900/40 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-300">
              Prepared for
            </p>
            <p className="mt-1 truncate font-display text-lg font-bold text-white">
              {clientName.trim() || "Your Client"}
            </p>
            {videoUrl.trim() && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-glow-300">
                <Film className="h-3.5 w-3.5" /> Pitch video embedded at the top of the proposal
              </p>
            )}
            <div className="mt-4 space-y-2">
              {selected.length === 0 && (
                <p className="text-xs text-mute">Pick modules to see your package.</p>
              )}
              {selected.map((id) => {
                const s = ALL_SERVICES.find((x) => x.id === id);
                return s ? (
                  <div key={id} className="flex items-center gap-2 text-xs text-fog">
                    <Check className="h-3.5 w-3.5 shrink-0 text-glow-400" />
                    <span className="truncate">{s.title}</span>
                  </div>
                ) : null;
              })}
            </div>
            <div className="mt-5 flex items-end justify-between border-t border-white/5 pt-4">
              <div>
                <p className="text-[11px] text-mute">Regular price</p>
                <p className="text-sm font-semibold text-mute line-through">
                  ${shownList.toLocaleString()}
                  {billingMode === "monthly" ? "/mo" : ""}
                </p>
              </div>
              {discountPct > 0 && (
                <Badge variant="emerald" className="px-2.5 py-1">
                  <BadgePercent className="h-3 w-3" /> Save {discountPct}%
                </Badge>
              )}
              <div className="text-right">
                <p className="text-[11px] text-mute">
                  {billingMode === "monthly" ? "12-month rate" : "Offer price"}
                </p>
                <p className="font-display text-2xl font-extrabold text-glow-400">
                  ${shownPrice.toLocaleString()}
                  {billingMode === "monthly" ? "/mo" : ""}
                </p>
                <p className="mt-0.5 text-[10px] text-mute">
                  {billingMode === "monthly"
                    ? `${selected.length > 0 ? `setup ${oneTimeTotal.toLocaleString()} + ` : ""}6/12/24-mo terms`
                    : "one-time investment"}
                </p>
              </div>
            </div>
          </div>

          {created && (
            <div className="mt-4 rounded-2xl border border-glow-500/30 bg-glow-500/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-glow-400">
                <CheckCircle2 className="h-4 w-4" /> Proposal draft saved
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <button
                  onClick={() => copyOfferLink(created)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-xs font-semibold text-mist transition hover:border-white/25 hover:text-white"
                >
                  {copiedToken === created.id ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-glow-400" /> Copied link
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy proposal link
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleSend(created)}
                  disabled={sendingId !== null}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition disabled:opacity-60",
                    sentId === created.id
                      ? "border-glow-500/40 bg-glow-500/10 text-glow-400"
                      : "border-brand-500/40 bg-brand-500/10 text-brand-300 hover:bg-brand-500/20",
                  )}
                >
                  {sendingId === created.id ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…
                    </>
                  ) : sentId === created.id ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Proposal emailed
                    </>
                  ) : (
                    <>
                      <Mail className="h-3.5 w-3.5" /> Send proposal email
                    </>
                  )}
                </button>
                {created.billingMode === "one-time" ? (
                  created.stripePaymentLink ? (
                    <a
                      href={created.stripePaymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-glow-500/20 py-2 text-xs font-semibold text-glow-400 transition hover:bg-glow-500/30"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Open Stripe payment link
                    </a>
                  ) : (
                    <button
                      onClick={() => handlePaymentLink(created)}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-glow-500/20 py-2 text-xs font-semibold text-glow-400 transition hover:bg-glow-500/30"
                    >
                      {busyToken === created.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <DollarSign className="h-3.5 w-3.5" />
                      )}{" "}
                      Generate payment link
                    </button>
                  )
                ) : (
                  <p className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-xs text-mute">
                    <BadgePercent className="h-3.5 w-3.5" /> Client picks their
                    term &amp; pays on the proposal page
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Offer list */}
      <div className="rounded-2xl border border-white/8 bg-ink-850/50 p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-white">Recorded offers</h3>
          <Badge variant="brand">{offers.length} offers</Badge>
        </div>
        {!loaded ? (
          <p className="mt-4 text-sm text-fog">Loading offers…</p>
        ) : offers.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-fog">
            No offers yet — compose your first one above. Paid offers create the
            client order and queue their fulfillment tasks automatically.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {offers.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-ink-800/40 px-4 py-3"
              >
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase",
                    STATUS_STYLE[o.status],
                  )}
                >
                  {o.status}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-mist">{o.clientName}</p>
                  <p className="truncate text-[11px] text-mute">
                    {o.services.length} modules ·{" "}
                    {o.billingMode === "monthly" ? (
                      <>
                        {o.discountPct > 0 ? "list " : ""}
                        <span className={o.discountPct > 0 ? "line-through" : ""}>
                          ${o.listPrice.toLocaleString()}/mo
                        </span>{" "}
                        → ${o.offerPrice.toLocaleString()}/mo
                        {o.discountPct > 0 ? ` · save ${o.discountPct}%` : ""}
                      </>
                    ) : (
                      <>
                        {o.discountPct > 0 && (
                          <span className="line-through">${o.listPrice.toLocaleString()}</span>
                        )}{" "}
                        ${o.offerPrice.toLocaleString()}
                        {o.discountPct > 0 ? ` · save ${o.discountPct}%` : ""}
                      </>
                    )}{" "}
                    · {new Date(o.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => copyOfferLink(o)}
                    title="Copy proposal link"
                    className="rounded-lg border border-white/10 p-2 text-mist transition hover:border-white/25 hover:text-white"
                  >
                    {copiedToken === o.id ? (
                      <Check className="h-3.5 w-3.5 text-glow-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleSend(o)}
                    disabled={sendingId !== null}
                    title={sentId === o.id ? "Proposal emailed" : "Send proposal email"}
                    className="rounded-lg border border-white/10 p-2 text-mist transition hover:border-brand-500/40 hover:text-brand-300"
                  >
                    {sendingId === o.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : sentId === o.id ? (
                      <Check className="h-3.5 w-3.5 text-glow-400" />
                    ) : (
                      <Mail className="h-3.5 w-3.5" />
                    )}
                  </button>
                  {o.billingMode === "one-time" && !o.stripePaymentLink && o.status !== "paid" && (
                    <button
                      onClick={() => handlePaymentLink(o)}
                      title="Generate payment link"
                      className="rounded-lg border border-white/10 p-2 text-mist transition hover:border-glow-500/40 hover:text-glow-400"
                    >
                      {busyToken === o.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <DollarSign className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                  {o.status === "draft" && (
                    <button
                      onClick={() => setStatus(o, "sent")}
                      title="Mark sent"
                      className="rounded-lg border border-white/10 p-2 text-mist transition hover:border-amber-500/40 hover:text-amber-300"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {o.status !== "paid" && o.status !== "declined" && (
                    <button
                      onClick={() => setStatus(o, "declined")}
                      title="Mark declined"
                      className="rounded-lg border border-white/10 p-2 text-mist transition hover:border-rose-500/40 hover:text-rose-300"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {o.status !== "paid" && (
                    <button
                      onClick={() => removeOffer(o)}
                      title="Delete offer"
                      className="rounded-lg border border-white/10 p-2 text-mist transition hover:border-rose-500/40 hover:text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
