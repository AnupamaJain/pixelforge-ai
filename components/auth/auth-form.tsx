"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

/** Shared email/password form for sign-in and sign-up. */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSignup = mode === "signup";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!email.trim()) next.email = "Enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Enter a valid email address.";

    if (!password) next.password = "Enter your password.";
    else if (isSignup && password.length < 8)
      next.password = "Use at least 8 characters.";

    if (isSignup && confirmPassword !== password)
      next.confirmPassword = "Passwords don't match.";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);

    if (!validate()) return;

    setLoading(true);
    const supabase = createClient();

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        // With email confirmation enabled there is no session yet.
        if (!data.session) {
          setNotice(
            "Check your inbox to confirm your email address, then sign in.",
          );
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }

      const next = searchParams.get("next") || "/app";
      router.push(next);
      router.refresh();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[--radius-lg] border border-border bg-surface p-6">
      <h1 className="text-xl font-semibold tracking-tight">
        {isSignup ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1.5 text-sm text-fg-muted">
        {isSignup
          ? "Start with free credits every month. No card required."
          : "Sign in to your creative workspace."}
      </p>

      {formError ? (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2.5 rounded-[--radius-sm] border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{formError}</span>
        </div>
      ) : null}

      {notice ? (
        <div
          role="status"
          className="mt-5 rounded-[--radius-sm] border border-success/30 bg-success/5 p-3 text-sm text-success"
        >
          {notice}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            placeholder="you@example.com"
          />
          <FieldError id="email-error">{errors.email}</FieldError>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="password"
            hint={
              !isSignup ? (
                <Link href="/forgot-password" className="text-accent hover:underline">
                  Forgot?
                </Link>
              ) : undefined
            }
          >
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            placeholder={isSignup ? "At least 8 characters" : "••••••••"}
          />
          <FieldError id="password-error">{errors.password}</FieldError>
        </div>

        {isSignup ? (
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={errors.confirmPassword ? "confirm-error" : undefined}
              placeholder="••••••••"
            />
            <FieldError id="confirm-error">{errors.confirmPassword}</FieldError>
          </div>
        ) : null}

        <Button type="submit" className="w-full" loading={loading}>
          {isSignup ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-fg-muted">
        {isSignup ? "Already have an account? " : "New to PixelForge AI? "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-medium text-accent hover:underline"
        >
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
