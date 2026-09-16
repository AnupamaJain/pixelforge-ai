import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { UnauthorizedError } from "@/lib/auth";
import { InsufficientCreditsError } from "@/lib/credits";
import { RateLimitError } from "@/lib/rate-limit";
import { SafetyRejectionError } from "@/lib/safety";
import { UploadValidationError } from "@/lib/storage";
import { ProviderError } from "@/lib/generation-engine/types";
import { firstIssue } from "@/lib/validation/schemas";

/** Raised when a request is valid but not permitted on the caller's plan. */
export class PlanRestrictionError extends Error {
  readonly status = 403;
  constructor(message: string) {
    super(message);
    this.name = "PlanRestrictionError";
  }
}

export class NotFoundError extends Error {
  readonly status = 404;
  constructor(message = "Not found.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class BadRequestError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

/**
 * Maps a thrown error to a response. Anything unrecognised becomes a generic
 * 500 — internal messages (which may carry provider keys or hostnames) are
 * logged, never returned.
 */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: firstIssue(error) }, { status: 400 });
  }

  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (error instanceof InsufficientCreditsError) {
    return NextResponse.json(
      {
        error: error.message,
        code: "INSUFFICIENT_CREDITS",
        required: error.required,
        available: error.available,
      },
      { status: 402 },
    );
  }

  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: error.message, code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
    );
  }

  if (
    error instanceof SafetyRejectionError ||
    error instanceof UploadValidationError ||
    error instanceof PlanRestrictionError ||
    error instanceof NotFoundError ||
    error instanceof BadRequestError
  ) {
    return NextResponse.json(
      { error: error.message },
      { status: (error as { status: number }).status },
    );
  }

  if (error instanceof ProviderError) {
    return NextResponse.json({ error: error.userMessage }, { status: 502 });
  }

  console.error("[api] unhandled error", error);
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 },
  );
}
