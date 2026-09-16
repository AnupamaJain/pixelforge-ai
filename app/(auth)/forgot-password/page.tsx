"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setLoading(false);

    // Always report success — revealing whether an address exists would leak
    // account membership.
    if (resetError) console.error(resetError.message);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-[--radius-lg] border border-border bg-surface p-6">
        <h1 className="text-xl font-semibold tracking-tight">Check your inbox</h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          If an account exists for <strong className="text-fg">{email}</strong>,
          we&apos;ve sent a link to reset your password.
        </p>
        <Link href="/login" className="mt-5 block">
          <Button variant="secondary" className="w-full">
            Back to sign in
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-[--radius-lg] border border-border bg-surface p-6">
      <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-1.5 text-sm text-fg-muted">
        We&apos;ll email you a link to set a new one.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "email-error" : undefined}
            placeholder="you@example.com"
          />
          <FieldError id="email-error">{error}</FieldError>
        </div>

        <Button type="submit" className="w-full" loading={loading}>
          Send reset link
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-fg-muted">
        <Link href="/login" className="font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
