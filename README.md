# PixelForge AI

**Product photography without the photoshoot.**

Upload one product photo, get back marketplace-ready scenes — with your product
**pixel-identical** in every one, because it is composited from your original
file rather than generated.

Also includes general text-to-image, image-to-image, upscaling, brand kits,
CSV-driven batch runs, marketplace export presets, creative performance
tracking, a server-enforced credit system, and Stripe subscriptions.

Built to be **run locally first**, then deployed.

---

## Table of contents

1. [Product overview](#1-product-overview)
2. [Architecture](#2-architecture)
3. [Technology stack](#3-technology-stack)
4. [Project structure](#4-project-structure)
5. [Prerequisites](#5-prerequisites)
6. [Local setup](#6-local-setup)
7. [Supabase setup](#7-supabase-setup)
8. [Storage setup](#8-storage-setup)
9. [AI provider setup](#9-ai-provider-setup)
10. [InvokeAI setup](#10-invokeai-setup-mode-b)
11. [Stripe setup](#11-stripe-setup)
12. [Stripe webhook setup](#12-stripe-webhook-setup)
13. [Environment variables](#13-environment-variables)
14. [Running locally](#14-running-locally)
15. [Testing](#15-testing)
16. [Production build](#16-production-build)
17. [Deployment](#17-deployment)
18. [Troubleshooting](#18-troubleshooting)
19. [SEO](#19-seo)
20. [Licensing](#20-licensing)

---

## 1. Product overview

PixelForge AI is a creative workspace built around a single loop:

> **Generate → Transform → Upscale → Save → Browse → Reuse → Pay**

| Capability | Notes |
|---|---|
| **Product Studio** | Segment a product, generate a scene around it, composite the original pixels back — then verify none changed |
| **Brand kits** | Palette, prompt language and exclusions applied to every generation |
| **Batch runs** | Paste a CSV, write one template, generate a whole catalogue. Each row bills and refunds independently |
| **Marketplace export** | Amazon, Shopify, Etsy, eBay, Instagram, Pinterest and print presets, single file or ZIP |
| **Performance tracking** | Import per-creative metrics, sorted by ROAS |
| Text-to-image | 12 style presets, 6 aspect ratios, seed control |
| Image-to-image | Strength dial; the original upload is never modified |
| Upscaling | 2× and 4× via a real super-resolution model |
| Gallery & history | Full metadata, favourites, searchable and re-runnable |
| Credits | Server-enforced, append-only ledger, automatic refunds |
| Billing | Stripe Checkout, portal, signature-verified idempotent webhooks |

### Plans

| | Free | Starter | Growth | Agency |
|---|---|---|---|---|
| Price | $0 | $49/mo | $149/mo | $499/mo |
| Monthly credits | 30 | 600 | 2,500 | 10,000 |
| Max resolution | 768px | 1536px | 2048px | 2048px |
| Images per request | 2 | 4 | 8 | 8 |
| Product Studio | — | ✅ | ✅ | ✅ |
| Brand kits | — | 1 | 5 | 50 |
| Batch rows | — | 25 | 200 | 1,000 |
| Marketplace export | — | ✅ | ✅ | ✅ |
| Performance tracking | — | — | ✅ | ✅ |
| Client workspaces | — | — | — | 25 |
| White-label + API | — | — | — | ✅ |

Every limit is environment-configurable — see [`config/plans.ts`](config/plans.ts).

### Credit costs

| Action | Credits |
|---|---|
| Text-to-image | 1 per image |
| Image-to-image | 2 per image |
| **Product scene** | **5 per image** |
| Upscale 2× | 3 |
| Upscale 4× | 6 |

Requesting 4 images costs 4× the per-image price. **A failed generation is
always refunded in full.**

---

## 1a. The pixel-identical guarantee

This is the product's core claim, so it is implemented as a check rather than a
promise. In [`lib/generation-engine/product-scene.ts`](lib/generation-engine/product-scene.ts):

1. The product is **segmented** out of the uploaded photo (provider).
2. A base image + dilated mask are built so the model paints only *around* it.
3. The **scene** is generated (provider).
4. The **original product pixels are composited back** over the scene — ours,
   in [`lib/generation-engine/composite.ts`](lib/generation-engine/composite.ts).
5. Every fully-opaque product pixel is **compared byte for byte** against the
   source. If any differ, the generation **fails and credits are refunded**.

Because step 4 happens in our code rather than in a prompt, the guarantee holds
for any provider. `npm run test:composite` proves it — including a negative
control that confirms a *modified* product is detected.

> **Product Studio requires `IMAGE_PROVIDER=hosted`.** InvokeAI ships the
> building blocks (`grounding_dino` → `segment_anything` →
> `apply_tensor_mask_to_image`) but that graph is not wired up, so the InvokeAI
> provider reports `productScenes: false` rather than failing at runtime.

---

## 2. Architecture

### The generation lifecycle

Long-running model calls never block the HTTP request:

```
POST /api/generate
  │
  ├─ 1. Authenticate (server-side; the browser's plan/credit copy is ignored)
  ├─ 2. Validate every parameter with zod
  ├─ 3. Screen the prompt (lib/safety)
  ├─ 4. Enforce plan limits (resolution, image count, feature access)
  ├─ 5. INSERT generation row (status=QUEUED)
  ├─ 6. spend_credits()  ← atomic, row-locked; rolls back the row if short
  ├─ 7. INSERT prompt_history + generation_jobs row
  ├─ 8. Schedule processJob() via after()
  └─ 9. 202 Accepted { generationId, creditsRemaining }

        client polls GET /api/generations/:id every 1.5s

processJob()
  ├─ Claim the job (compare-and-set QUEUED → PROCESSING)
  ├─ Call the provider through the engine abstraction
  ├─ Persist every output into our own storage
  ├─ Mark COMPLETED
  └─ on failure → mark FAILED, refund credits (idempotently), log internally
```

`POST /api/jobs/sweep` is the backstop: it picks up jobs that were queued but
never started because an instance died mid-request.

### The provider abstraction

Nothing outside `providers/` knows which engine is running. The rest of the app
calls three functions:

```ts
import { generateImage, imageToImage, upscaleImage } from "@/lib/generation-engine";
```

Every provider implements `ImageGenerationProvider` and returns a **normalised**
result, so the UI never becomes provider-specific:

```ts
{
  images: [{ data: Buffer, contentType, width, height, seed }],
  metadata: { provider, model, seed, steps, guidance, durationMs }
}
```

Providers also declare their `capabilities`. The workspace reads these and
**hides controls the engine would ignore** — if an engine doesn't honour
`steps`, the slider isn't rendered.

Swapping engines means adding one file under `providers/` and registering it in
[`lib/generation-engine/index.ts`](lib/generation-engine/index.ts). No route,
component or table changes.

### Security model

| Concern | How it's handled |
|---|---|
| Credit balances | Client-readable, **never** client-writable. Only `SECURITY DEFINER` functions mutate them |
| Race conditions | `SELECT … FOR UPDATE` inside `spend_credits()` serialises concurrent spends |
| Subscription state | Written **only** by the signature-verified Stripe webhook |
| Duplicate webhooks | Stripe event IDs stored as a primary key; grants keyed per billing period |
| Row access | RLS on every table, scoped to `auth.uid()` |
| Image access | Private buckets; short-lived signed URLs minted server-side after an ownership check |
| Uploads | Validated by **magic bytes**, not the declared MIME type |
| Provider keys | Server-only. No browser code path reaches a provider |
| Provider errors | Logged internally; users see a sanitised message |

---

## 3. Technology stack

- **Next.js 15** (App Router) · **React 19** · **TypeScript** (strict)
- **Tailwind CSS v4** with CSS-variable design tokens
- **Supabase** — Postgres, Auth, Storage
- **Stripe** — subscriptions (test mode by default)
- **zod** — server-side validation
- **sharp** — image measurement and format conversion

---

## 4. Project structure

```
app/
  (marketing)/       Landing page + pricing (public)
  (auth)/            Login, signup, password reset
  (app)/             Authenticated workspace
    app/             Dashboard
    product-studio/  Pixel-identical product scenes
    generate/        Text-to-image
    image-to-image/  Transforms
    upscale/         Upscaling
    batch/           CSV-driven bulk runs
    brand-kits/      Reusable brand definitions
    gallery/  history/  billing/  settings/
  api/               All server endpoints
components/
  generation/  gallery/  layout/  marketing/  auth/  ui/
config/
  plans.ts        Plan definitions and limits
  credits.ts      Credit pricing
  styles.ts       Style preset catalogue
  scenes.ts       Product scene catalogue
  marketplace.ts  Export presets (Amazon, Shopify, …)
  showcase.ts     Marketing imagery manifest
  testimonials.ts Testimonials + anti-fabrication guard
  generation.ts   Aspect ratios, sizes, ranges
lib/
  auth/  credits/  generation-engine/  safety/  storage/
  stripe/  supabase/  rate-limit/  validation/  jobs/  api/
providers/
  hosted/      Replicate adapter
  invokeai/    Self-hosted InvokeAI adapter + graph builders
lib/generation-engine/
  composite.ts     Pixel-identical compositing + verification
  product-scene.ts Segment -> generate -> composite -> verify
supabase/migrations/
  0001_init.sql                  Schema + RLS
  0002_credits_and_triggers.sql  Atomic credit functions
  0003_storage.sql               Buckets + storage policies
  0004_generation_type_enum.sql  PRODUCT_SCENE enum value
  0005_studio.sql                Brand kits, batch, clients, performance
scripts/
  verify-logic.ts      Business-logic test suite
  verify-composite.ts  Pixel-identical guarantee test suite
```

---

## 5. Prerequisites

- **Node.js 20+** (22 recommended) and npm
- A **Supabase** account (free tier is sufficient)
- A **Stripe** account (test mode)
- One of:
  - a **Replicate** API token (Mode A — recommended to start), or
  - a machine that can run **InvokeAI** (Mode B — needs a GPU)

> **You do not need a GPU to run this app.** Mode A calls a hosted API. A GPU is
> only required if you self-host the generation engine.

---

## 6. Local setup

```bash
git clone <your-repo-url>
cd pixelforge-ai

npm install

cp .env.example .env.local
# Fill in .env.local as you work through sections 7–12.

npm run dev
```

Open **http://localhost:3000**.

Once configured, `GET /api/health` reports which services are wired up:

```bash
curl http://localhost:3000/api/health | jq
```

---

## 7. Supabase setup

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Go to **Project Settings → API** and copy into `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...   # server-only, never expose
```

3. **Run the migrations.** In the dashboard, open **SQL Editor** and run each
   file **in order**:

   1. `supabase/migrations/0001_init.sql`
   2. `supabase/migrations/0002_credits_and_triggers.sql`
   3. `supabase/migrations/0003_storage.sql`
   4. `supabase/migrations/0004_generation_type_enum.sql`
   5. `supabase/migrations/0005_studio.sql`

   > `0004` and `0005` are separate because `ALTER TYPE … ADD VALUE` must be
   > committed before the new enum value can be used. Run them as two
   > statements, not one.

   Or with the Supabase CLI:

```bash
npm i -g supabase
supabase link --project-ref <your-project-ref>
supabase db push
```

4. **Configure auth.** Under **Authentication → Providers**, ensure Email is
   enabled. Under **Authentication → URL Configuration**, set:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`

> **Tip for local development:** under **Authentication → Providers → Email**,
> turn *Confirm email* **off**. Signups then get a session immediately instead
> of requiring an inbox round-trip. Turn it back on for production.

### What the migrations create

`0001` defines the schema and RLS. Note that `credit_balances` and
`subscriptions` have **select-only** policies — there is deliberately no insert
or update policy, so clients cannot write to them at all.

`0002` adds the atomic credit functions and a trigger that bootstraps every new
user with a profile, a balance, a subscription row and a welcome grant.

`0003` creates two **private** buckets and per-user access policies.

---

## 8. Storage setup

`0003_storage.sql` creates both buckets automatically:

| Bucket | Purpose | Limit |
|---|---|---|
| `generations` | Model outputs | 25MB |
| `uploads` | User-supplied source images | 10MB |

Objects are laid out as `users/{user_id}/…` and both buckets are **private**.
Images reach the browser only through signed URLs minted server-side after an
ownership check.

If the bucket creation step fails (some projects restrict `storage.buckets`
inserts), create the two buckets manually in **Storage → New bucket**, leave
**Public** unchecked, then re-run the policy section of the migration.

---

## 9. AI provider setup

### Mode A — hosted (recommended to start)

No GPU needed. Get a token from
[replicate.com/account/api-tokens](https://replicate.com/account/api-tokens):

```bash
IMAGE_PROVIDER=hosted
IMAGE_PROVIDER_API_KEY=r8_xxxxxxxxxxxxxxxx
```

Replicate bills per prediction. Costs are small but real — you are calling a
paid API.

Pin different model versions if you want:

```bash
HOSTED_SDXL_VERSION=<version-hash>
HOSTED_ESRGAN_VERSION=<version-hash>
```

### Mode B — self-hosted InvokeAI

```bash
IMAGE_PROVIDER=invokeai
INVOKEAI_BASE_URL=http://127.0.0.1:9090
```

See the next section.

---

## 10. InvokeAI setup (Mode B)

### Hardware reality check

InvokeAI's hardware requirements **vary substantially by model and
resolution**. Do not assume any developer machine can run SDXL locally.

| | Practical minimum for SDXL @1024² |
|---|---|
| **NVIDIA** | 8GB VRAM (12GB+ comfortable) |
| **Apple Silicon** | M-series, 16GB+ unified memory (noticeably slower) |
| **AMD** | ROCm on Linux; support is less mature |
| **Disk** | ~15GB for an SDXL checkpoint plus its VAE |
| **CPU-only** | Technically possible, impractically slow |

If you don't have this, **use Mode A.** The SaaS frontend itself has no GPU
requirement whatsoever.

### Install and run

```bash
# Follow the official installer:
#   https://invoke-ai.github.io/InvokeAI/installation/INSTALLATION/
invokeai-web
```

InvokeAI listens on `http://127.0.0.1:9090` by default.

### Install an SDXL model

Open InvokeAI's UI → **Model Manager** → install an **SDXL** checkpoint.

> Our graph builders emit SDXL-specific nodes (`sdxl_model_loader`,
> `sdxl_compel_prompt`), so an SD-1.5 model will be rejected with a clear error.
> Pin a particular model with `INVOKEAI_MODEL_KEY`.

For upscaling, InvokeAI downloads the Real-ESRGAN weights on first use
(`RealESRGAN_x2plus.pth` for 2×, `RealESRGAN_x4plus.pth` for 4×).

### Verify the connection

```bash
curl http://localhost:3000/api/health | jq .provider
# { "id": "invokeai", "reachable": true, "detail": "InvokeAI 6.x.x" }
```

### How the integration works

`providers/invokeai/` talks to InvokeAI over HTTP only — no vendored code:

| Step | Endpoint |
|---|---|
| Upload a source image | `POST /api/v1/images/upload` |
| Submit a graph | `POST /api/v1/queue/{queue_id}/enqueue_batch` |
| Poll for completion | `GET /api/v1/queue/{queue_id}/i/{item_id}` |
| Download the result | `GET /api/v1/images/i/{image_name}/full` |

**⚠️ Before charging money, read [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).**
Model weights carry their own licences, and at least one model shipped through
InvokeAI (the NVIDIA PiD decoder) is **non-commercial only**.

---

## 11. Stripe setup

1. Create an account and **stay in Test mode** (toggle, top-right).
2. **Developers → API keys** → copy the secret key:

```bash
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

3. **Product catalogue → Add product**, three times — one per paid tier:

   | Product | Price | Billing |
   |---|---|---|
   | PixelForge AI Starter | $49.00 | Recurring, monthly |
   | PixelForge AI Growth | $149.00 | Recurring, monthly |
   | PixelForge AI Agency | $499.00 | Recurring, monthly |

4. Copy each **price ID** (starts `price_`):

```bash
STRIPE_PRICE_ID_STARTER=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_GROWTH=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_AGENCY=price_xxxxxxxxxxxxx

# Display only; Stripe owns the amount actually charged.
STARTER_PRICE_CENTS=4900
GROWTH_PRICE_CENTS=14900
AGENCY_PRICE_CENTS=49900
```

> The webhook resolves a customer's tier from **the price Stripe is billing**,
> falling back to checkout metadata. Get these IDs wrong and a paying customer
> lands on the wrong plan.

5. **Enable the billing portal** at
   [dashboard.stripe.com/test/settings/billing/portal](https://dashboard.stripe.com/test/settings/billing/portal)
   — click *Activate*. Without this, "Manage subscription" returns an error.

### Test cards

| Card | Result |
|---|---|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0025 0000 3155` | Requires 3D Secure |

Any future expiry, any CVC, any postcode.

---

## 12. Stripe webhook setup

**The webhook is not optional.** It is the only thing that grants Pro access and
monthly credits. Checkout alone changes nothing in the database.

### Local

```bash
brew install stripe/stripe-cli/stripe   # or see stripe.com/docs/stripe-cli
stripe login
npm run stripe:listen
```

Copy the printed `whsec_…` into `.env.local` and **restart `npm run dev`**:

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

Leave `stripe listen` running in its own terminal.

Trigger an event to check the wiring:

```bash
stripe trigger checkout.session.completed
```

### Production

**Developers → Webhooks → Add endpoint:**

- URL: `https://your-domain.com/api/stripe/webhook`
- Events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`

Copy that endpoint's signing secret into your production environment.

### Why it's safe

Every request is signature-verified against `STRIPE_WEBHOOK_SECRET` using the
**raw** body. Event IDs are inserted into `stripe_events` as a primary key, so a
duplicate delivery short-circuits. Credit grants are additionally keyed by
billing period inside `grant_monthly_credits()` — so even a replayed event
cannot double-grant.

---

## 13. Environment variables

See [`.env.example`](.env.example) for the annotated master list.

### Required

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only.** Bypasses RLS |
| `NEXT_PUBLIC_APP_URL` | Base URL for redirects |
| `IMAGE_PROVIDER` | `hosted` or `invokeai` |

### Provider

| Variable | Mode |
|---|---|
| `IMAGE_PROVIDER_API_KEY` | A |
| `INVOKEAI_BASE_URL` | B |
| `INVOKEAI_API_KEY` | B (if secured) |
| `INVOKEAI_MODEL_KEY` | B (optional) |

### Stripe

`STRIPE_SECRET_KEY` · `STRIPE_WEBHOOK_SECRET` ·
`STRIPE_PRICE_ID_STARTER` · `STRIPE_PRICE_ID_GROWTH` · `STRIPE_PRICE_ID_AGENCY`

### Marketing page honesty flags

| Variable | Effect |
|---|---|
| `NEXT_PUBLIC_SHOWCASE_PLACEHOLDER` | Anything but `false` shows a "Sample imagery" note, because `/public/showcase` ships licensed **stock photos**, not output from this app. Replace the files with real generations, then set to `false`. |
| `NEXT_PUBLIC_SHOW_PLACEHOLDER_TESTIMONIALS` | Placeholder testimonials **never render** unless this is `true`. Set it only locally. See below. |

> **On testimonials:** `config/testimonials.ts` ships placeholders that are
> filtered out in production by default. Fabricated testimonials are illegal
> under the FTC's 16 CFR Part 465 (US), the DMCC Act 2024 (UK) and the UCPD
> (EU). Only add real quotes, with written permission, and record `consentDate`.

### Tunables (all optional, with sane defaults)

`FREE_MONTHLY_CREDITS` · `PRO_MONTHLY_CREDITS` · `PRO_PRICE_CENTS`
`MAX_FREE_RESOLUTION` · `MAX_PRO_RESOLUTION`
`FREE_MAX_IMAGES_PER_REQUEST` · `PRO_MAX_IMAGES_PER_REQUEST`
`TEXT_TO_IMAGE_CREDIT_COST` · `IMAGE_TO_IMAGE_CREDIT_COST`
`UPSCALE_2X_CREDIT_COST` · `UPSCALE_4X_CREDIT_COST`
`MAX_UPLOAD_SIZE_MB` · `SIGNED_URL_TTL_SECONDS`
`SAFETY_ENABLED` · `MAX_PROMPT_LENGTH`
`RATE_LIMIT_GENERATIONS_PER_MINUTE` · `RATE_LIMIT_UPLOADS_PER_MINUTE`
`CRON_SECRET`

> **Never commit `.env` or `.env.local`.** Both are gitignored. Only
> `NEXT_PUBLIC_*` variables reach the browser.

---

## 14. Running locally

Three terminals:

```bash
# 1. The app
npm run dev

# 2. Stripe webhooks (only if testing billing)
npm run stripe:listen

# 3. InvokeAI (only in Mode B)
invokeai-web
```

### Manual smoke test

1. Open `/` — the landing page.
2. `/signup` — create an account. You should be granted 50 credits.
3. `/app` — the dashboard shows your balance.
4. `/generate` — enter a prompt, pick a style, hit **Generate**.
5. Watch the balance drop and the image arrive.
6. Open the image → check its metadata, copy the prompt, download it.
7. `/gallery` — favourite it, filter to favourites.
8. `/history` — search your prompt, reuse it.
9. `/pricing` → **Upgrade** → pay with `4242…` → land back on `/billing` as Pro.
10. `/image-to-image` and `/upscale` are now unlocked.

### Verifying refunds

Break the provider deliberately (set `IMAGE_PROVIDER_API_KEY` to a bad value, or
stop InvokeAI), then generate. The job should end **FAILED**, you should see
*"Your credits have been refunded"*, and `/billing` should show a matching
`REFUND` row in the ledger.

---

## 15. Testing

```bash
npm run typecheck      # strict TypeScript across the whole project
npm test               # both suites below
npm run test:composite  # pixel-identical guarantee only
npm run build          # full production build
```

**`scripts/verify-logic.ts` (39 checks)** covers the rules users feel most
directly: credit pricing, dimension resolution and plan caps, style
composition, and the prompt safety layer — including checks that innocuous
prompts like *"children playing in a park"* are **not** falsely blocked.

**`scripts/verify-composite.ts` (14 checks)** proves the pixel-identical
guarantee end to end: that segmentation output has a real alpha channel, that
the generated mask protects the product while leaving the rest paintable, that
compositing preserves every opaque pixel across several placements and on
non-square canvases, and — critically — a **negative control** confirming that
a product which *has* been altered is correctly detected.

Neither suite needs a database, an API key or a network connection.

---

## 16. Production build

```bash
npm run build
npm run start
```

---

## 17. Deployment

### Vercel

```bash
npm i -g vercel
vercel
```

Then:

1. Add every variable from `.env.local` in **Project → Settings →
   Environment Variables**. Set `NEXT_PUBLIC_APP_URL` to your real domain.
2. Update Supabase **Authentication → URL Configuration** with the production
   Site URL and `https://your-domain.com/auth/callback`.
3. Add the production Stripe webhook (section 12) and store its signing secret.
4. Optional but recommended — add a cron to sweep stalled jobs. Create
   `vercel.json`:

```json
{
  "crons": [{ "path": "/api/jobs/sweep", "schedule": "*/5 * * * *" }]
}
```

   Set `CRON_SECRET` (`openssl rand -hex 32`); Vercel Cron sends it as a bearer
   token automatically.

> **Mode B does not work on Vercel** unless your InvokeAI server is reachable
> from the internet. Serverless functions cannot reach your laptop's
> `127.0.0.1`. Either use Mode A in production, or host InvokeAI on a GPU box
> and point `INVOKEAI_BASE_URL` at it over HTTPS.

### Self-hosting

Any Node host works. `sharp` needs native binaries, so use a Debian-based image
rather than bare Alpine, or add `vips` to it.

### Pre-launch checklist

- [ ] Supabase email confirmation switched **back on**
- [ ] Stripe moved to **live** keys, and a **live** webhook registered
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set as a server-side secret only
- [ ] Terms of Service passing the RAIL restrictions to users
- [ ] Privacy policy covering prompt and image storage
- [ ] [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) reviewed for your model choice
- [ ] Rate limiting moved to a shared store if running multiple instances
      (see [`lib/rate-limit/index.ts`](lib/rate-limit/index.ts))

---

## 18. Troubleshooting

**Signup succeeds but no credits appear.**
`0002_credits_and_triggers.sql` didn't run, or the trigger failed. Check
**Database → Triggers** for `on_auth_user_created` on `auth.users`, and look at
the Postgres logs.

**"Image generation is not configured on this server."**
`IMAGE_PROVIDER_API_KEY` is missing (Mode A) or `INVOKEAI_BASE_URL` is unset
(Mode B). Check `/api/health`.

**Generation stays QUEUED forever.**
The background worker never ran. Check the server logs for `[worker]` entries,
then call `POST /api/jobs/sweep` with your `CRON_SECRET` bearer token.

**"No image model is installed on the generation server."**
Mode B with no SDXL model. Install one in InvokeAI's Model Manager.

**Upgrade completes but the account stays Free.**
The webhook isn't reaching you. Confirm `stripe listen` is running, that
`STRIPE_WEBHOOK_SECRET` matches its current output, and that you restarted
`npm run dev` after setting it. Check **Developers → Events** in Stripe for
delivery failures.

**"Manage subscription" errors.**
Activate the billing portal in the Stripe dashboard (section 11, step 5).

**Images show "Preview unavailable".**
Signed URL generation failed. Verify both buckets exist, are **private**, and
that `SUPABASE_SERVICE_ROLE_KEY` is correct.

**Uploads rejected as "Unsupported image format".**
Files are validated by magic bytes. A `.png` that is actually something else
will be rejected — this is intentional.

**Build fails on `sharp`.**
Native dependency. On Alpine, `apk add vips-dev`, or switch to a Debian image.

---

## 19. SEO

### What is and isn't promised

**No one can guarantee a #1 Google ranking**, and any tool or agency that
promises one is misleading you. Position depends on domain authority,
backlinks, competitor behaviour and algorithm updates — none of which live in
this repository.

What the code *does* control is implemented here: crawlability, structured
data, canonical URLs, page speed, internal linking, and pages that genuinely
answer a query better than the ones currently ranking.

### Keyword strategy

Defined in [`config/seo.ts`](config/seo.ts) with three clusters, in priority
order:

| Cluster | Example | Why |
|---|---|---|
| **Marketplace specs** | `amazon product image requirements` | Proven demand, commercial intent, and the current SERP is thin AI-tool blogs — winnable |
| **Industry + use case** | `jewelry product photography ai` | Lower volume, far higher intent, almost no quality competition |
| **Problem-aware** | `keep product consistent ai images` | Low volume, but it is the deciding question for our buyer |

`EXCLUDED_KEYWORDS` records terms deliberately *not* targeted and why —
`ai image generator` is owned by Midjourney, OpenAI, Canva and Adobe, and the
traffic is hobbyists rather than buyers.

> **Volume and difficulty figures in that file are directional estimates from
> SERP inspection, not measurements.** Validate them in Google Search Console
> and a real keyword tool before committing spend.

### What was built

- **16 indexable pages** — 4 marketplace guides + hub, 8 industry guides + hub,
  home, pricing. All statically rendered.
- **Structured data** — Organization, WebSite, SoftwareApplication (with the
  full pricing ladder as Offers), FAQPage, BreadcrumbList, HowTo. Rich results
  don't lift rankings directly, but they change click-through at the same
  position.
- **`sitemap.xml` and `robots.txt`** — generated from config, so new guides
  appear automatically. App routes are disallowed: they require a session, so
  crawling them burns budget on redirects.
- **Canonical URLs, Open Graph and Twitter cards** on every page, with a
  generated OG image at `/opengraph-image`.
- **`noindex`** on all authenticated and auth screens.
- **Internal linking** — footer links every guide; each guide cross-links its
  siblings.

### Deliberately not done

**Keyword stuffing.** Google's spam policies treat it as a signal *against* a
page. Each term in `config/seo.ts` maps to exactly one page that earns it.

### Realistic expectations

Long-tail marketplace and industry terms are achievable within a few months
given consistent publishing and a handful of real backlinks. The head term
`ai product photography` is a 6–12 month goal at best. Content velocity and
backlinks — not code — are what move it from there.

## 20. Licensing

This application's own source is yours to license as you choose.

Its **dependencies and model weights are not.** Before charging anyone, read
**[THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)** — in particular:

- InvokeAI's code is Apache-2.0 (commercial use fine; we integrate over HTTP
  and vendor none of it).
- SDXL weights are CreativeML Open RAIL++-M: commercial use is permitted **but
  carries use restrictions you must pass on to your users.**
- The NVIDIA **PiD decoder weights are non-commercial only.** This app never
  selects them; don't add them to a paid deployment.

PixelForge AI is **not affiliated with, endorsed by, or sponsored by** Invoke
Inc., Stability AI, NVIDIA or Replicate.
