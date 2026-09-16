# Viral ad creatives

Short-form ads for paid social, built with
[HyperFrames](https://github.com/heygen-com/hyperframes) — HeyGen's
open-source HTML-to-video engine (Apache-2.0). Compositions are plain HTML +
GSAP, captured frame-by-frame in headless Chrome and encoded with FFmpeg.

This sits alongside `../video/`, which uses Remotion for the longer
brand/demo pieces. Two engines on purpose: Remotion is React-component
authoring, HyperFrames is HTML/CSS authoring. Use whichever suits the piece.

## Output

| File | Format | Length | Placement |
|---|---|---|---|
| `renders/viral-cost-shock.mp4` | 1080×1920 | 14s | Reels, TikTok, Stories |
| `renders/viral-pov-fail.mp4` | 1080×1920 | 13s | Reels, TikTok, Stories |
| `renders/viral-three-second-test.mp4` | 1080×1080 | 11s | Feed, LinkedIn |

## The three hooks

Each opens on a different emotion, because the same hook fatigues fast when
you're running multiple creatives against one audience.

**`cost-shock`** — money. Opens on `$2,000`, strikes it through, replaces it
with `$49`. Works on cold traffic who have never considered the alternative.

**`pov-fail`** — recognition. "POV: you asked AI for a product photo", then
the product visibly warps on screen. Works on people who have *already tried*
a generic tool and been disappointed.

**`three-second-test`** — curiosity. Two images, "which is the real one?". The
viewer commits to an answer before the difference becomes obvious, and that
commitment is what holds them to the reveal.

## Commands

```bash
npm run ads:preview   # studio with scrubbing
npm run ads:all       # render all three
```

Or per-composition from this directory:

```bash
npx hyperframes render -c compositions/cost-shock.html \
  -o renders/viral-cost-shock.mp4 --fps 30
```

## How a composition works

A composition is one HTML file. The root element declares the timeline:

```html
<div id="root" data-composition-id="main" data-start="0" data-duration="14"
     data-width="1080" data-height="1920" data-fps="30">
```

Animation is a **paused** GSAP timeline registered globally:

```js
window.__timelines["main"] = tl;
```

HyperFrames seeks that timeline to `floor(time * fps)` for each frame and
screenshots it. Rendering is therefore deterministic — the same composition
produces byte-identical frames every run, which is what makes it diffable and
CI-safe.

**Consequence worth knowing:** anything driven by `Date.now()`, `Math.random()`
or real elapsed time will not render correctly. Drive everything from the
timeline.

## Safe areas

Vertical compositions pad `250–260px` top and `350–360px` bottom. Platform UI
— captions, handles, the action rail — covers roughly that much on TikTok and
Instagram. Text outside those bounds gets obscured in the feed even though it
looks fine in the file.

## Honesty

The degraded product in `pov-fail` and `three-second-test` is an honest
depiction of how img2img pipelines fail: the product passes through the model
and drifts. It names no competitor, and it must stay that way — naming a
company beside output you fabricated for them invites a trademark claim.

Claims in these ads come from [`../MESSAGING.md`](../MESSAGING.md). The pricing
shown ($2,000 photoshoot, $49/mo) matches `config/plans.ts`. If either changes,
change it there first.

## Before publishing

- **Swap in real generations.** The product is a stock placeholder with a
  generated cutout, not output from the app.
- **Add captions.** Most feed video is watched muted, and these carry no audio.
- **License any music** for commercial use.

## Licensing

HyperFrames is Apache-2.0 — genuinely open source, no seat limits, unlike
Remotion's company licence. Rendering is local (headless Chrome + FFmpeg); the
`cloud`, `lambda` and `cloudrun` subcommands are optional paid/hosted paths we
do not use.

Telemetry is disabled in this project (`hyperframes telemetry disable`).
