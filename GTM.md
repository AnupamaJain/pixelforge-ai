# Go-to-market

Written for: you, and whoever you hire to run growth.

Positioning and copy live in [MESSAGING.md](MESSAGING.md). This is the
commercial plan — what it costs to serve, what you can afford to spend to
acquire, where the first customers come from, and in what order.

---

## 0. You cannot sell this yet

One thing blocks everything below: **no image provider is configured.**
`/api/health` on production says so. The app signs people up, meters credits
and enforces plans correctly — and then cannot generate an image.

```bash
vercel env add IMAGE_PROVIDER_API_KEY production   # Replicate token
vercel deploy --prod
```

Until that is done, every marketing activity below burns goodwill on a product
that fails at the moment of truth. Do this first.

Second blocker, smaller: Stripe is not connected, so nobody can pay you. See
README §11.

---

## 1. The USP, in one line

> **We never generate your product. We generate the scene around it, then put
> your real pixels back — and check that not one of them changed.**

Everything else is a feature. Full argument in [MESSAGING.md](MESSAGING.md).

---

## 2. Unit economics — and why they decide your strategy

Cost to serve one product scene: **$0.006–$0.015** (background removal + SDXL
generation + storage). At the plan level, assuming a customer burns **100%** of
their allowance, which almost none will:

| Plan | Price | Scenes included | COGS at full use | Gross margin |
|---|---|---|---|---|
| Starter | $49 | 120 | $0.72–$1.80 | **96–98%** |
| Growth | $149 | 500 | $3.00–$7.50 | **95–98%** |
| Agency | $499 | 2,000 | $12–$30 | **94–98%** |

Free tier exposure is **$0.12/user/month** worst case, because product scenes
are gated behind a paid plan and Free only gets text-to-image.

**Why this matters more than anything else in this document:**

At 6%/month churn (typical SMB SaaS), a Starter customer is worth ~$791 and a
Growth customer ~$2,406. At a 3:1 LTV:CAC ratio you can afford:

| Plan | LTV | Max CAC |
|---|---|---|
| Starter | $791 | **$264** |
| Growth | $2,406 | **$802** |
| Agency | $8,059 | **$2,686** |

A $264 acquisition budget on a $49/month product is unusual. Most tools at this
price point are stuck with content and organic because paid does not pay back.
**You can buy customers.** That is your single biggest strategic advantage, and
it comes from margin, not cleverness.

> Caveat: those LTVs assume 6% churn, which is an industry benchmark, not your
> number. Measure it from month three and recompute. If real churn is 12%,
> every CAC ceiling above halves.

---

## 3. Your first ten customers

Not a channel strategy. Ten specific people, found by hand, in about two weeks.

**Where they are:** Shopify and Etsy sellers in jewelry, skincare and
candles — categories where generic AI visibly fails and photography is most
expensive per item.

**How to find them:** search Etsy and Shopify collections for shops whose
product photos are plainly DIY — phone shots on a kitchen table, inconsistent
backgrounds, poor lighting. That is the signal. A shop with beautiful
photography already solved this.

**What to send:** not a pitch. Generate three scenes from one of their existing
product photos and send the images with one line:

> "Made these from your listing photo for [product]. Your product is untouched
> in all three — only the background is generated. Free if you want more."

**Why this works:** it is the demo, the proof and the personalisation in one
artefact, and it takes you four minutes per prospect. Ten replies from fifty
sends is a realistic expectation.

**What you are actually buying:** not the $490/month. You are buying the
sentences they use to describe the problem, and permission to quote them. Both
are worth more than the revenue at this stage.

---

## 4. Channels, ranked

Ordered by expected return for a product with no audience and no brand.

### 4.1 Shopify App Store — the highest-leverage thing you can build

People arrive already trying to solve this. Intent is pre-qualified, the
listing compounds, and Shopify handles billing and trust.

- **Effort:** 2–4 weeks (OAuth, embedded app, listing review)
- **Realistic:** 5–20 installs/week within three months of a well-reviewed listing
- **Do:** name the listing for the problem ("Product photos without a photoshoot"), not the technology

This is the single best use of engineering time after the provider key.

### 4.2 Programmatic SEO — already built, needs publishing

Sixteen pages are live: four marketplace image-requirement guides and eight
industry pages. The SERP research showed these terms are currently owned by
thin AI-tool blogs, which is beatable.

- **Effort:** already done; needs backlinks and time
- **Realistic:** meaningful traffic at month 4–8, not month 1
- **Do:** get five real backlinks. Ecommerce newsletters, Shopify community
  forums, a guest post. Content without links does not rank.

### 4.3 Cold outbound with a generated sample

Section 3, industrialised. Scrape Shopify stores with weak imagery, generate a
sample, send it.

- **Effort:** continuous, but scriptable
- **Realistic:** 2–5% reply rate with a personalised image; near zero without
- **Cost:** ~$0.03 of provider spend per prospect — trivially affordable
- **Do:** lead with the image, not the product name

### 4.4 Agencies — best revenue per conversation

One agency with twenty clients is worth more than twenty solo sellers, churns
less, and needs no education about why photography costs money.

- **Effort:** direct outreach, one call each
- **Realistic:** slow to close, high value. Agency tier is $499
- **Do:** lead with client workspaces, brand kits and white-label export

### 4.5 Paid social — viable *because of your margin*

Most $49/month tools cannot make paid work. You can, up to $264 CAC.

- **Effort:** the three ad creatives in `ads/` are ready
- **Realistic:** start at $20/day, kill anything above $264 CAC after 50 clicks
- **Do:** run the three hooks against each other — cost, recognition, curiosity.
  Retarget with the six-second bumpers

### 4.6 Build in public

Cheap, slow, compounding. Post the pixel-verification test passing. It is a
genuinely unusual engineering claim and technical audiences respond to proof.

---

## 5. Pricing: things to change and things not to

**Do not** lower prices to win early customers. At 96% margin the problem is
never price, and discounting teaches the market your ceiling.

**Do** add annual billing at two months free. It converts 20–40% of new
subscribers, halves churn exposure and pulls cash forward — which matters when
you are funding acquisition.

**Consider** a credit top-up SKU. Someone who exhausts Starter mid-month is
your best customer signalling they want to pay more. Right now they can only
wait or upgrade.

**Watch** the Free tier. 30 credits at $0.12/month exposure is safe. If you see
mass signup with no conversion, the problem is that Free is too *useful*, not
too expensive — product scenes being Pro-only is the right lever.

---

## 6. The sales motion

**Self-serve** for Starter and Growth. Nobody talks to you. The landing page,
the runtime showcase and the free tier do the selling. Your job is to remove
friction, not to add a demo call.

**Founder-led** for Agency. $499/month justifies a conversation, and agencies
want to know a human exists before they route client work through you.

**Never** put "book a demo" in front of a $49 plan. It will halve your
conversion and fill your calendar with people who were going to buy anyway.

---

## 7. First ninety days

**Days 1–7 — make it real**
Provider key. Stripe live. Generate fifty images yourself across ten product
categories. Replace the stock imagery on the site with real output and set
`NEXT_PUBLIC_SHOWCASE_PLACEHOLDER=false`. Until this is done you are selling a
promise.

**Days 8–30 — ten customers by hand**
Section 3. Free accounts if needed. Get the sentences they use. Ask for
permission to quote them and record `consentDate` in `config/testimonials.ts`.

**Days 31–60 — build the compounding channel**
Shopify app submission. Five backlinks to the SEO pages. First paid tests at
$20/day. Replace the "Guarantees, not testimonials" section with real quotes.

**Days 61–90 — measure and decide**
You now have real churn, real CAC and real activation. Recompute section 2 with
your numbers. Double down on whichever channel produced customers, and cut the
others without sentiment.

---

## 8. What to measure

Four numbers. Ignore the rest until these are healthy.

| Metric | Why | Warning sign |
|---|---|---|
| **Activation** — signed up → first generation | The whole funnel dies here first | Under 40% |
| **Free → paid** | Whether the wedge works | Under 3% |
| **Monthly churn** | Every LTV above depends on it | Over 8% |
| **CAC by channel** | Tells you where to spend | Above the §2 ceilings |

Track credits used per paying customer too. If it is under 20%, people are not
getting value and will churn regardless of what the dashboard says.

---

## 9. Honest risks

**The model providers absorb this.** OpenAI or Google could ship product-aware
image editing and take the general case. Your defence is not model quality —
it is workflow, marketplace integration, brand kits and the accumulated
catalogue. Build those, not a better prompt.

**Incumbents copy the claim.** Photoroom or Pebblely could composite and verify
too. It requires inverting their architecture, which buys you maybe twelve
months. Use it to get distribution, not to polish features.

**The niche is too small.** Jewelry-on-Shopify is a beachhead, not a market. It
has to expand into adjacent categories within a year or growth stalls.

**Churn is worse than 6%.** SMB ecommerce tools often see 8–12%. At 12% the
Starter CAC ceiling falls to about $130 and paid social gets marginal. Measure
before you scale spend.

---

## 10. When to stop

Set these now, while you are unattached to the outcome.

- **Ninety days, fewer than 10 paying customers** after doing section 7
  properly → the wedge is wrong. Change the category, not the copy.
- **Activation stuck under 25%** → the product is too hard to get value from.
  Fix onboarding before spending another pound on acquisition.
- **CAC above LTV/3 on every channel after real testing** → the price is wrong
  or the audience is. Move upmarket to agencies rather than discounting.
