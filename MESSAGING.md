# Positioning & Messaging

Written for: whoever writes your ads, site copy, sales emails and video scripts.

Everything here is grounded in what the product actually does. If a claim
isn't in this document, don't make it — and if you change the product, change
this first.

---

## 1. The USP, in one sentence

> **We never generate your product. We generate the scene around it, then put
> your real pixels back — and check that not one of them changed.**

That is the whole business. Everything else is a feature.

---

## 2. Why this is a USP and not a tagline

A USP has to be three things at once. Most aren't.

| Test | Does it pass? |
|---|---|
| **Is it true?** | Yes — the product is composited from the customer's own file. Verified in `lib/generation-engine/composite.ts` |
| **Is it different?** | Yes — competitors run img2img pipelines where the product *is* model output |
| **Does anyone care?** | Yes — a warped label is a misdescribed item, a suppressed listing, and a return |

The third one is what most AI tools miss. "Higher quality images" is not a
reason to buy. "Your listing won't get suppressed" is.

---

## 3. The problem we actually solve

Not "making images is slow." That's the surface.

The real problem: **generic AI tools produce images a seller cannot legally or
commercially use.**

- The label text comes back smeared — and on skincare or food, that text is
  regulated copy.
- The stone in a ring has the wrong facets — that's a misdescribed item.
- A device gains a port it doesn't have — that's a return.
- Amazon requires the main image to show the actual product being sold.

So the seller is left with images that look fine in a feed and are unusable on
a product page. They go back to the $2,000 photoshoot.

**We remove the reason they have to go back.**

---

## 4. The proof stack

Lead with the claim. Back it in this order — each one is checkable.

**1. Architectural.** The product is segmented from the customer's photograph
and composited over the generated scene. It is never passed through the model
as something to be re-drawn.

**2. Verified.** After compositing, every fully-opaque product pixel is
compared byte for byte against the source. If any differ, the generation fails.

**3. Paid for.** A failed verification refunds credits automatically. We are
financially exposed to our own claim being wrong.

**4. Tested.** `npm run test:composite` — 14 checks, including a negative
control proving an altered product *is* detected.

> Point 3 is the strongest and the most underused. Anyone can claim accuracy.
> Almost nobody refunds themselves when they miss.

---

## 5. Messaging hierarchy

Use in this order. Don't lead with features.

```
1. PROBLEM    Every other AI tool redraws your product.
2. STAKE      A warped label is a suppressed listing.
3. CLAIM      We only generate the scene.
4. PROOF      Every pixel verified. Failed runs refunded.
5. OUTCOME    One photo in. A whole catalogue out.
6. ACTION     30 free credits. No card.
```

---

## 6. Headline variants

Tested against the same claim, for different contexts.

**Primary**
> Product photography without the photoshoot

**Sharpest (leads with the differentiator)**
> Every other AI tool redraws your product. We don't.

**Outcome-led**
> One product photo in. Fifty marketplace-ready scenes out.

**Cost-led (best for cold traffic)**
> A photoshoot costs $2,000. This costs $49.

**Risk-led (best for Amazon sellers)**
> AI product photos that won't get your listing suppressed

**Category-led**
> Jewelry photography that keeps the stone

---

## 7. Objection handling

| Objection | Response |
|---|---|
| *"AI images look fake"* | The product isn't AI — it's your photograph. Only the background is generated. |
| *"Will Amazon allow it?"* | Amazon's policy is about accuracy, not method: the image must show the actual product. Compositing your real product is *more* compliant than generating an approximation. |
| *"I tried ChatGPT, the label was wrong"* | That's exactly the failure this exists to fix. ChatGPT generates the product. We never do. |
| *"How do I know it's unchanged?"* | We check every pixel and fail the run if any changed. You aren't charged when that happens. |
| *"I have 400 SKUs"* | Paste your spreadsheet. Each row is billed and refunded separately, so one failure doesn't cost you the run. |
| *"What if I don't like it?"* | Free credits monthly, no card. Failed runs never cost anything. |

---

## 8. Words to avoid

| Don't say | Because |
|---|---|
| "Photorealistic" | Implies the product is generated. It isn't — that's the point. |
| "AI-generated product photos" | Literally contradicts the USP. Say *"AI-generated scenes."* |
| "Perfect every time" | Unfalsifiable, and we can't support it. |
| "Trusted by thousands" | Not true yet. Don't. |
| "Replaces your photographer" | You still need one photo. Say *"one shoot, not four."* |

---

## 9. Audience-specific angles

**Solo Shopify/Etsy sellers** — cost. They know a shoot is $500–2,000 and
they've been putting it off. Lead with the price comparison.

**Amazon sellers** — risk. They've had a listing suppressed or know someone
who has. Lead with compliance and the exact-white requirement.

**Agencies** — throughput and margin. They bill clients for imagery. Lead with
batch runs, brand kits and client workspaces.

**Jewelry, skincare, electronics** — category failure. Name the specific way
generic tools break *their* product. This converts best; it proves you
understand their category.

---

## 10. What we are not claiming

Keep this list honest, and check it before every campaign.

- We do **not** claim customer numbers, ratings or testimonials. There are none yet.
- We do **not** claim named companies as customers.
- We do **not** claim to replace photography entirely — you still shoot once.
- We do **not** claim on-model apparel photography. Generating people raises
  consent and likeness issues we avoid deliberately.
- We do **not** claim Amazon approval or endorsement.

When the first real customers arrive, replace section 10 with their words —
and keep consent dates.
