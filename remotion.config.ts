import { Config } from "@remotion/cli/config";

/**
 * Remotion render configuration.
 *
 * `public/` is the static root so compositions can reference the same showcase
 * images the website uses, keeping the video and the site visually identical.
 */
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setPublicDir("public");
Config.setConcurrency(4);
// CRF 18 is visually lossless for flat motion graphics at a sane file size.
Config.setCrf(18);
