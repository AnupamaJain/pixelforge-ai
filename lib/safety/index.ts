import "server-only";

/**
 * Prompt safety layer.
 *
 * Deliberately minimal and keyword-based: this is a tripwire for obviously
 * disallowed requests, not a moderation platform. It is isolated here so it can
 * be swapped for a hosted classifier without touching the generation routes.
 *
 * Set SAFETY_ENABLED=false to disable (useful for local development against a
 * self-hosted engine where the operator applies their own policy).
 */

export interface SafetyVerdict {
  allowed: boolean;
  reason?: string;
  category?: string;
}

/**
 * Categories the application refuses outright. Matching is word-boundary based
 * to limit false positives on innocuous substrings.
 */
const BLOCKED_PATTERNS: { category: string; patterns: RegExp[]; reason: string }[] = [
  {
    category: "csam",
    reason: "This request appears to involve minors in a sexual context.",
    patterns: [
      /\b(child|children|kid|kids|minor|minors|underage|teen|teens|toddler|infant|preteen|loli|shota)\b[^.]{0,40}\b(nude|naked|nsfw|sexual|sexy|erotic|porn|explicit|lingerie|undressed)\b/i,
      /\b(nude|naked|nsfw|sexual|sexy|erotic|porn|explicit)\b[^.]{0,40}\b(child|children|kid|kids|minor|minors|underage|toddler|infant|preteen)\b/i,
      /\bcsam\b/i,
    ],
  },
  {
    category: "non_consensual",
    reason: "This request appears to depict a real person in an explicit or non-consensual way.",
    patterns: [
      /\b(deepfake|deep fake)\b[^.]{0,40}\b(nude|naked|porn|explicit|sexual)\b/i,
      /\b(nude|naked|porn|explicit)\b[^.]{0,40}\b(without consent|non-?consensual|revenge)\b/i,
    ],
  },
  {
    category: "extremist",
    reason: "This request appears to promote violent extremism.",
    patterns: [
      /\b(isis|nazi|swastika)\b[^.]{0,40}\b(propaganda|recruitment|glorif\w*|celebrat\w*)\b/i,
      /\bpropaganda\b[^.]{0,40}\b(terrorist|extremist|genocide)\b/i,
    ],
  },
  {
    category: "graphic_violence",
    reason: "This request describes graphic real-world violence against an identifiable person.",
    patterns: [
      /\b(gore|mutilat\w*|dismember\w*|beheading|torture)\b[^.]{0,40}\b(real|actual|photo|photograph)\b/i,
    ],
  },
  {
    category: "fraud",
    reason: "This request appears to involve forged identity or financial documents.",
    patterns: [
      /\b(forge|forged|counterfeit|fake)\b[^.]{0,30}\b(passport|id card|identity card|driver'?s licen[cs]e|banknote|currency|credit card|certificate)\b/i,
    ],
  },
];

const MAX_PROMPT_LENGTH = Number.parseInt(
  process.env.MAX_PROMPT_LENGTH || "2000",
  10,
);

function isEnabled(): boolean {
  return process.env.SAFETY_ENABLED !== "false";
}

/** Screens a prompt before any credits are spent. */
export function checkPrompt(
  prompt: string,
  negativePrompt?: string | null,
): SafetyVerdict {
  const trimmed = prompt.trim();

  if (trimmed.length === 0) {
    return { allowed: false, reason: "Enter a prompt describing the image you want." };
  }

  if (trimmed.length > MAX_PROMPT_LENGTH) {
    return {
      allowed: false,
      reason: `Prompts are limited to ${MAX_PROMPT_LENGTH} characters.`,
    };
  }

  if (!isEnabled()) return { allowed: true };

  // The negative prompt is screened too — it is still model input.
  const haystack = `${trimmed} ${negativePrompt ?? ""}`;

  for (const rule of BLOCKED_PATTERNS) {
    if (rule.patterns.some((pattern) => pattern.test(haystack))) {
      return { allowed: false, reason: rule.reason, category: rule.category };
    }
  }

  return { allowed: true };
}

export class SafetyRejectionError extends Error {
  readonly status = 400;
  constructor(
    message: string,
    readonly category?: string,
  ) {
    super(message);
    this.name = "SafetyRejectionError";
  }
}

/** Throws when a prompt is disallowed. Call before spending credits. */
export function assertPromptAllowed(
  prompt: string,
  negativePrompt?: string | null,
): void {
  const verdict = checkPrompt(prompt, negativePrompt);
  if (!verdict.allowed) {
    throw new SafetyRejectionError(
      verdict.reason ?? "This prompt is not allowed.",
      verdict.category,
    );
  }
}
