/**
 * Verification suite for the pure business logic: credit pricing, dimension
 * resolution, style composition and prompt safety.
 *
 * These are the rules a paying user feels most directly, so they are checked
 * without needing a database, a provider or a network. Run with `npm test`.
 */
import { calculateCreditCost, CREDIT_COSTS } from "../config/credits";
import { resolveDimensions, snapTo64, withinResolutionLimit } from "../config/generation";
import { applyStyle, getStyle, STYLE_PRESETS } from "../config/styles";
import { checkPrompt } from "../lib/safety";

let pass = 0;
let fail = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("\n== Credit calculation ==");
check("t2i 1 image = 1 credit", calculateCreditCost({ type: "TEXT_TO_IMAGE", imageCount: 1 }) === 1);
check("t2i 4 images = 4 credits", calculateCreditCost({ type: "TEXT_TO_IMAGE", imageCount: 4 }) === 4);
check("i2i 1 image = 2 credits", calculateCreditCost({ type: "IMAGE_TO_IMAGE", imageCount: 1 }) === 2);
check("i2i 4 images = 8 credits", calculateCreditCost({ type: "IMAGE_TO_IMAGE", imageCount: 4 }) === 8);
check("upscale 2x = 3 credits", calculateCreditCost({ type: "UPSCALE", upscaleFactor: 2 }) === 3);
check("upscale 4x = 6 credits", calculateCreditCost({ type: "UPSCALE", upscaleFactor: 4 }) === 6);
check("upscale ignores imageCount", calculateCreditCost({ type: "UPSCALE", upscaleFactor: 4, imageCount: 4 }) === 6);
check("zero/undefined count floors at 1", calculateCreditCost({ type: "TEXT_TO_IMAGE" }) === CREDIT_COSTS.TEXT_TO_IMAGE);

console.log("\n== Dimension resolution ==");
const square = resolveDimensions("1:1", 1024);
check("1:1 @1024 -> 1024x1024", square.width === 1024 && square.height === 1024, JSON.stringify(square));
const wide = resolveDimensions("16:9", 1024);
check("16:9 is landscape", wide.width > wide.height, JSON.stringify(wide));
check("16:9 dims are multiples of 64", wide.width % 64 === 0 && wide.height % 64 === 0, JSON.stringify(wide));
const tall = resolveDimensions("9:16", 1024);
check("9:16 is portrait", tall.height > tall.width, JSON.stringify(tall));
check("16:9 and 9:16 are transposes", wide.width === tall.height && wide.height === tall.width);
check("area is roughly preserved", Math.abs(wide.width * wide.height - square.width * square.height) / (square.width * square.height) < 0.1);
check("snapTo64 rounds", snapTo64(100) === 128 && snapTo64(1000) === 1024);
check("snapTo64 floors at 64", snapTo64(1) === 64);
check("resolution limit rejects oversize", !withinResolutionLimit(1536, 1024, 768));
check("resolution limit accepts in-range", withinResolutionLimit(768, 768, 768));

console.log("\n== Free-plan gating (768px cap) ==");
const freeWide = resolveDimensions("16:9", 1024);
check("1024 base @16:9 exceeds free cap", !withinResolutionLimit(freeWide.width, freeWide.height, 768), JSON.stringify(freeWide));
const freeOk = resolveDimensions("1:1", 768);
check("768 base @1:1 within free cap", withinResolutionLimit(freeOk.width, freeOk.height, 768));

console.log("\n== Style presets ==");
check("12 styles + none = 13", STYLE_PRESETS.length === 13, String(STYLE_PRESETS.length));
check("all style ids unique", new Set(STYLE_PRESETS.map(s => s.id)).size === STYLE_PRESETS.length);
check("unknown style falls back", getStyle("does-not-exist").id === "photorealistic");
const styled = applyStyle("cinematic", "a lighthouse", "people");
check("style injects prompt", styled.prompt.startsWith("a lighthouse") && styled.prompt.includes("cinematic still"), styled.prompt.slice(0, 60));
check("user negative preserved first", styled.negativePrompt.startsWith("people"));
check("style negative appended", styled.negativePrompt.includes("blurry"));
const passthrough = applyStyle("none", "a lighthouse", null);
check("'none' passes prompt through", passthrough.prompt === "a lighthouse", passthrough.prompt);
check("every style has modifiers", STYLE_PRESETS.every(s => s.id === "none" || (s.promptModifier && s.negativePromptModifier)));

console.log("\n== Safety layer ==");
check("normal prompt allowed", checkPrompt("a golden retriever in a field").allowed);
check("artistic nude allowed", checkPrompt("classical marble nude sculpture in a museum").allowed);
check("empty prompt rejected", !checkPrompt("   ").allowed);
check("overlong prompt rejected", !checkPrompt("x".repeat(2100)).allowed);
const csam = checkPrompt("nude child photo");
check("csam pattern blocked", !csam.allowed && csam.category === "csam", JSON.stringify(csam));
check("csam reverse order blocked", !checkPrompt("a child, naked").allowed);
check("forged documents blocked", !checkPrompt("a counterfeit passport for john smith").allowed);
check("deepfake porn blocked", !checkPrompt("deepfake nude of a celebrity").allowed);
check("negative prompt is screened", !checkPrompt("a landscape", "nude child").allowed);
check("'children playing' NOT blocked", checkPrompt("children playing in a park").allowed);
check("'kid with a kite' NOT blocked", checkPrompt("a kid flying a kite at sunset").allowed);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
