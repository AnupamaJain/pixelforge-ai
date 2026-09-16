/**
 * Testimonials.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  READ THIS BEFORE ADDING ANYTHING HERE
 * ─────────────────────────────────────────────────────────────────────────────
 * Only ever put REAL quotes from REAL customers in this file, with their
 * permission.
 *
 * Fabricated testimonials are illegal in the US under the FTC's Rule on
 * Consumer Reviews and Testimonials (16 CFR Part 465, in force since October
 * 2024), which authorises civil penalties per violation. The UK's DMCC Act
 * 2024 and the EU's Unfair Commercial Practices Directive prohibit them too.
 * Beyond the legal exposure, a prospect who catches one invented quote stops
 * believing everything else on the page.
 *
 * The entries below are marked `placeholder: true`. Placeholders NEVER render
 * in production — `getTestimonials()` filters them out unless
 * NEXT_PUBLIC_SHOW_PLACEHOLDER_TESTIMONIALS is explicitly "true", which should
 * only be done locally while designing. This is deliberate: it makes shipping a
 * fake testimonial something you have to do on purpose rather than by accident.
 *
 * When you have your first real customers:
 *   1. Ask permission in writing.
 *   2. Replace an entry, set `placeholder: false`, and record `consentDate`.
 *   3. Keep the quote verbatim — tightening someone's words changes them.
 */

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  company: string;
  /** Path under /public. Never use a stock headshot for a real person. */
  avatar?: string;
  /** A specific, verifiable outcome. Leave empty rather than inventing one. */
  metric?: { value: string; label: string };
  /** Placeholders are stripped in production. */
  placeholder: boolean;
  /** ISO date the customer agreed to be quoted. Required for real entries. */
  consentDate?: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "placeholder-1",
    quote:
      "Replace this with a real sentence a real customer said about the product. Keep their words, not a polished version of them.",
    name: "Customer name",
    role: "Their role",
    company: "Their company",
    placeholder: true,
  },
  {
    id: "placeholder-2",
    quote:
      "The most persuasive quotes name the thing that changed: what they used to do, what they do now, and what it cost them before.",
    name: "Customer name",
    role: "Their role",
    company: "Their company",
    placeholder: true,
  },
  {
    id: "placeholder-3",
    quote:
      "Only attach a metric if the customer gave you the number and agreed you can publish it.",
    name: "Customer name",
    role: "Their role",
    company: "Their company",
    placeholder: true,
  },
];

/** Real testimonials only, unless placeholders are explicitly enabled locally. */
export function getTestimonials(): Testimonial[] {
  const showPlaceholders =
    process.env.NEXT_PUBLIC_SHOW_PLACEHOLDER_TESTIMONIALS === "true";

  return TESTIMONIALS.filter(
    (testimonial) => showPlaceholders || !testimonial.placeholder,
  );
}

export function hasRealTestimonials(): boolean {
  return TESTIMONIALS.some((testimonial) => !testimonial.placeholder);
}

/**
 * Trust signals that are true from day one.
 *
 * A pre-launch product has no customers, and an empty testimonial section is
 * more honest — and more persuasive — than an invented one. These are claims
 * about how the product works, each verifiable in the codebase.
 */
export interface TrustSignal {
  id: string;
  title: string;
  body: string;
}

export const TRUST_SIGNALS: TrustSignal[] = [
  {
    id: "pixel-identical",
    title: "Your product is never redrawn",
    body: "Only the scene is generated. Your original pixels are composited back and verified afterwards — if any changed, the run fails and you keep your credits.",
  },
  {
    id: "refunds",
    title: "Failed runs cost nothing",
    body: "Credits are reserved when a job starts and returned in full the moment anything goes wrong. Every movement is recorded in a ledger you can read.",
  },
  {
    id: "private",
    title: "Your images stay yours",
    body: "Stored in private buckets and served only to you through short-lived signed links. Nothing is public, and nothing is used to train anything.",
  },
  {
    id: "no-lock-in",
    title: "Export anywhere",
    body: "Amazon, Shopify, Etsy, eBay and social presets built to each platform's published rules, plus full-resolution originals whenever you want them.",
  },
];
