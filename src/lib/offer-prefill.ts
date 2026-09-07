/** Hand-off from Lead Pitches ("Draft proposal") to the Offers builder. */
export const PREFILL_KEY = "biz-reborn-offer-prefill";

export interface OfferPrefill {
  clientName?: string;
  clientEmail?: string;
  services?: number[];
  notes?: string;
  videoUrl?: string;
  prospectId?: string | null;
}
