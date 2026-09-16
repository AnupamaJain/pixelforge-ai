import React from "react";
import { Composition } from "remotion";

import { FPS } from "./theme";
import { HeroDemo, HERO_DEMO_DURATION } from "./compositions/HeroDemo";
import { SocialVertical, SOCIAL_DURATION } from "./compositions/SocialVertical";

/**
 * Composition registry.
 *
 * Preview with `npm run video:studio`, render with `npm run video:render`.
 */
export function RemotionRoot() {
  return (
    <>
      <Composition
        id="HeroDemo"
        component={HeroDemo}
        durationInFrames={HERO_DEMO_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="SocialVertical"
        component={SocialVertical}
        durationInFrames={SOCIAL_DURATION}
        fps={FPS}
        width={1080}
        height={1920}
      />
      {/* Square cut for feed posts, reusing the vertical edit. */}
      <Composition
        id="SocialSquare"
        component={SocialVertical}
        durationInFrames={SOCIAL_DURATION}
        fps={FPS}
        width={1080}
        height={1080}
      />
    </>
  );
}
