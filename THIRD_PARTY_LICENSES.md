# Third-Party Licenses & Attribution

PixelForge AI is an original product. It depends on third-party open-source
software and, depending on how you configure it, on third-party model weights.
**Code licenses and model-weight licenses are separate**, and the weights are
where the commercial restrictions live.

This document records what we depend on and what each licence requires of you.
It is a good-faith engineering summary, not legal advice — if you are shipping
this commercially, have counsel review the model licences that apply to your
chosen configuration.

---

## 1. InvokeAI

- **Project:** https://github.com/invoke-ai/InvokeAI
- **Licence:** Apache License 2.0 (`LICENSE` in the InvokeAI repository)
- **How we use it:** PixelForge AI communicates with an InvokeAI server **over
  its HTTP API** when `IMAGE_PROVIDER=invokeai`. We do **not** vendor, fork,
  bundle or redistribute InvokeAI source code. The integration lives entirely
  in `providers/invokeai/`, which constructs request payloads against
  InvokeAI's documented endpoints.

**Why this matters:** because we integrate at the network boundary rather than
by copying code, our application is not a derivative work of InvokeAI. The
Apache-2.0 obligations (retain notices, state changes, include the licence when
redistributing) apply to InvokeAI's code, which we are not redistributing.

Apache 2.0 **permits commercial use.**

**If you choose to distribute InvokeAI alongside this application** (for
example, in a Docker image), you must then include InvokeAI's `LICENSE` file
and its `NOTICE` file, retain all copyright notices, and state any
modifications you made.

> PixelForge AI is **not affiliated with, endorsed by, or sponsored by** Invoke
> Inc. or the InvokeAI project. We use none of their branding, product name,
> logo, marketing copy or visual identity.

---

## 2. Model weights — read this before charging money

Model weights are licensed **separately from** the code that runs them.
Installing a model into InvokeAI does not grant you the right to use it
commercially.

| Model | Licence | Commercial use |
|---|---|---|
| **SDXL 1.0** | CreativeML Open RAIL++-M | **Permitted**, subject to use restrictions |
| **SD 1.x / 2.x** | CreativeML Open RAIL-M | **Permitted**, subject to use restrictions |
| **Real-ESRGAN** | BSD-3-Clause | Permitted |
| **PiD decoder (NVIDIA)** | NVIDIA Source Code License v1 (NSCLv1) | ❌ **NON-COMMERCIAL ONLY** |
| **HiDiffusion module keys** | BSD-3-Clause | Permitted |

### ⚠️ PiD weights are non-commercial

InvokeAI's `LICENSE-PiD.txt` states that the pre-trained PiD decoder
checkpoints distributed by NVIDIA are released under NSCLv1, under which the
weights **may only be used for non-commercial (research or evaluation)
purposes**. The Apache-2.0 licence covering the *code* does not extend to the
*weights*.

**PixelForge AI therefore never selects a PiD decoder.** The InvokeAI graph
builders in `providers/invokeai/graphs.ts` emit only standard SDXL nodes
(`sdxl_model_loader`, `sdxl_compel_prompt`, `denoise_latents`, `l2i`, `i2l`)
and `esrgan`. If you add PiD nodes yourself, you take on that restriction and
**you cannot charge for the result.**

### CreativeML Open RAIL — behavioural restrictions

The RAIL licences permit commercial use but attach **use-based restrictions**.
You may not use the model (or let your users use it) to, among other things:

- break any law, or exploit or harm minors;
- generate or disseminate verifiably false information to harm others;
- generate personal identifiable information likely to harm someone;
- defame, harass, or facilitate harassment of individuals;
- provide medical or legal advice without qualification;
- discriminate against individuals or groups based on protected characteristics.

**You are required to pass these restrictions on to your own users.** The
practical implication for a SaaS operator: your Terms of Service must bind your
users to the same restrictions, and you should keep some moderation capability
in place. The stub in `lib/safety/` is a starting point, not a compliance
programme — it is a keyword tripwire and nothing more.

Full licence texts are in the InvokeAI repository as `LICENSE-SDXL.txt`,
`LICENSE-SD1+SD2.txt`, `LICENSE-PiD.txt` and `LICENSE-HiDiffusion.txt`.

---

## 3. Hosted provider (Replicate)

When `IMAGE_PROVIDER=hosted`, generation runs on
[Replicate](https://replicate.com). You are then bound by Replicate's terms and
by the licence of whichever model version you configure. Replicate's default
SDXL and Real-ESRGAN deployments are the same models described above, so the
same weight licences apply.

For a commercial product this is often the cleaner path: you are not
distributing weights at all, and the provider's terms govern.

---

## 3a. Stock photography on the marketing page

The images in `/public/showcase` are photographs from
[Unsplash](https://unsplash.com), used under the
[Unsplash License](https://unsplash.com/license): free for commercial use, no
permission or attribution required.

**They are placeholders, not output from this application.** While
`NEXT_PUBLIC_SHOWCASE_PLACEHOLDER` is anything other than `false`, the landing
page renders a "Sample imagery" disclosure beneath them. Replace them with your
own generations before launch and set that flag to `false`.

Presenting stock photography as your product's output would be a false
advertising claim in most jurisdictions, quite apart from the trust cost.

## 3b. Testimonials

`config/testimonials.ts` ships **placeholders only**, filtered out of production
builds by default.

Publishing fabricated testimonials or reviews is unlawful under:

- **US** — FTC Rule on Consumer Reviews and Testimonials, 16 CFR Part 465,
  effective October 2024, with civil penalties per violation.
- **UK** — Digital Markets, Competition and Consumers Act 2024.
- **EU** — Unfair Commercial Practices Directive, Annex I.

Only publish quotes you actually received, with written permission, and record
the consent date on the entry.

## 3c. Marketing video assets

The videos in `out/` are rendered from React components in `video/`. Their
assets are deliberately free of third-party licensing:

- **Backdrops** (`scene-studio`, `scene-wood`, `marble`) are generated
  procedurally from SVG gradients. No stock licence applies.
- **`product-cutout.png`** is derived from an Unsplash photograph (Unsplash
  License — free for commercial use) by luminance-thresholding the background
  to transparency.
- **No audio track is included.** If you add music, license it for commercial
  use. Unlicensed audio is the most common way a marketing video attracts a
  copyright claim, and platform claims apply even to paid ads.

### The comparison video

`pixelforge-comparison.mp4` contrasts "Generic AI tools" against ours. The
degraded side is an honest characterisation of how img2img pipelines fail —
the product passes through the model and drifts — and names no company.

**Do not add a competitor's name or logo to it.** Characterising a category is
fair comment in most jurisdictions; naming a company alongside fabricated
output attributed to them is not, and invites both a trademark claim and a
comparative-advertising complaint.

## 3d. Remotion

- **Package:** `remotion`, `@remotion/cli`, `@remotion/bundler`, `@remotion/renderer`
- **Licence:** Remotion License (source-available, **not** OSI open source)

> ⚠️ **Remotion is free for individuals and for companies with fewer than four
> employees. Beyond that it requires a paid company licence.**

This is unusual among the dependencies here and easy to miss, because it
installs from npm like anything else. If your team grows past three people, buy
the licence: <https://remotion.dev/license>.

Remotion is a build-time tool. It is not bundled into the deployed web
application — it only renders the video files.

## 3e. HyperFrames

- **Package:** `hyperframes` (dev dependency)
- **Licence:** Apache-2.0 — genuinely open source, no seat limits
- **Upstream:** https://github.com/heygen-com/hyperframes

Used to render the short-form ads in `ads/`. Rendering is entirely local
(headless Chrome + FFmpeg); the `cloud`, `lambda` and `cloudrun` subcommands
are optional hosted paths this project does not use, so no data leaves the
machine.

HyperFrames collects anonymous usage telemetry by default. It is **disabled**
in this project — re-run `npx hyperframes telemetry disable` if you ever
re-scaffold.

Note the contrast with Remotion (3d): both render video, but HyperFrames is
Apache-2.0 with no employee threshold, while Remotion requires a paid company
licence above three employees. If licence simplicity matters as the team grows,
prefer HyperFrames.

### Ad creative content

The degraded product shown in `pov-fail` and `three-second-test` is an honest
depiction of how img2img pipelines fail — the product passes through the model
and drifts. **No competitor is named, and none may be added.** Naming a company
beside output you fabricated on their behalf invites both a trademark claim and
a comparative-advertising complaint.

## 4. Application dependencies

All are permissively licensed (MIT unless noted):

| Package | Licence |
|---|---|
| Next.js | MIT |
| React, React DOM | MIT |
| Tailwind CSS | MIT |
| TypeScript | Apache-2.0 |
| `@supabase/supabase-js`, `@supabase/ssr` | MIT |
| `stripe`, `@stripe/stripe-js` | MIT |
| `zod` | MIT |
| `sharp` | Apache-2.0 |
| `lucide-react` | ISC |
| `class-variance-authority` | Apache-2.0 |
| `clsx`, `tailwind-merge` | MIT |
| `server-only` | MIT |
| `remotion` (dev only) | Remotion License — see 3d |
| `hyperframes` (dev only) | Apache-2.0 — see 3e |

Inter (the UI typeface) is licensed under the SIL Open Font License 1.1 and is
loaded from Google Fonts.

Generate a full dependency manifest at any time with:

```bash
npx license-checker --production --summary
```

---

## 5. Your obligations as an operator

Before charging customers:

1. **Pick your models deliberately.** Confirm the licence of every model you
   install. Do not assume everything InvokeAI can load is commercially usable.
2. **Never enable PiD weights** in a paid deployment.
3. **Pass the RAIL restrictions through** to your users in your Terms of
   Service.
4. **Publish a privacy policy** covering generated images and prompt storage.
5. **Keep this file current** as you add dependencies or swap providers.
6. **Do not imply affiliation** with Invoke, Stability AI, NVIDIA or Replicate.
7. **Check your Remotion licence** if the team is four people or more.
8. **License any music** added to the marketing videos for commercial use.
9. **Replace the placeholder showcase imagery and testimonials** — see 3a and 3b.
