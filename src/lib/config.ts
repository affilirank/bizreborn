export const SITE = {
  name: "Biz Reborn Marketing",
  tagline: "Dominate Your Local Market",
  email: "hello@bizreborn.com",
  phone: "772-290-1756",
};

export const BRAND = {
  primary: "#6366F1",
  glow: "#10B981",
  ink: "#0B0F17",
};

/** Lead-generation pipeline settings (audits + pitch videos). */
export const LEADGEN = {
  /** Address used in pitch scripts and outreach templates. */
  email: "bizrebornmarketing@gmail.com",
  /** Max simultaneous pipeline runs per batch. */
  defaultConcurrency: 3,
};

/** Strategy-call booking calendar (public /book page + admin management). */
export const BOOKING = {
  /** Business operating timezone — slots are generated and stored in this zone. */
  timezone: "America/New_York",
  /** Days of week we take calls (0=Sun … 6=Sat). */
  workingDays: [1, 2, 3, 4, 5],
  /** First slot of the day (business-local wall clock). */
  startHour: 9,
  /** First hour NOT bookable (i.e. last slot starts at endHour - slotMinutes). */
  endHour: 17,
  /** Length of each call. */
  durationMinutes: 60,
  /** How many calendar days ahead prospects can book. */
  daysAhead: 14,
  /** Minimum notice required before a slot starts (hours). */
  minLeadHours: 24,
  /** Call flavors offered on the form. */
  callTypes: ["Strategy Call", "Discovery Call", "Follow-up Call"],
  /** Default status when a booking is created (auto-confirmed). */
  defaultStatus: "confirmed",
} as const;
