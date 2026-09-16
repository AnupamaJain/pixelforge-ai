"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, formatNumber } from "@/lib/utils";

export function SettingsView({
  userId,
  email,
  displayName,
  memberSince,
  planName,
  credits,
  lifetimeGranted,
  lifetimeSpent,
}: {
  userId: string;
  email: string;
  displayName: string;
  memberSince: string;
  planName: string;
  credits: number;
  lifetimeGranted: number;
  lifetimeSpent: number;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = React.useState(displayName);
  const [savingName, setSavingName] = React.useState(false);
  const [sendingReset, setSendingReset] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  async function saveName(event: React.FormEvent) {
    event.preventDefault();
    setSavingName(true);

    const supabase = createClient();
    // RLS permits a user to edit their own display name; the plan column is
    // pinned by a database trigger regardless of what the client sends.
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim() || null })
      .eq("id", userId);

    setSavingName(false);

    if (error) {
      toast("Could not save your name.", "error");
      return;
    }
    toast("Profile updated.", "success");
    router.refresh();
  }

  async function sendPasswordReset() {
    setSendingReset(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setSendingReset(false);
    toast("Password reset link sent to your email.", "success");
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Could not delete your account.");
      }
      await createClient().auth.signOut();
      router.push("/");
      router.refresh();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Could not delete your account.",
        "error",
      );
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Manage your profile, security and account.
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Member since {formatDateTime(memberSince)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveName} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} readOnly disabled />
                <p className="text-xs text-fg-subtle">
                  Your email address is used to sign in and can&apos;t be changed here.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="How should we address you?"
                  maxLength={60}
                />
              </div>

              <Button type="submit" size="sm" loading={savingName}>
                Save changes
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              We&apos;ll email you a secure link to set a new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="secondary"
              size="sm"
              loading={sendingReset}
              onClick={sendPasswordReset}
            >
              Send password reset link
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>You&apos;re on the {planName} plan.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-3 gap-4">
              <div>
                <dt className="text-xs text-fg-subtle">Remaining</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">
                  {formatNumber(credits)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">Granted</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">
                  {formatNumber(lifetimeGranted)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">Spent</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">
                  {formatNumber(lifetimeSpent)}
                </dd>
              </div>
            </dl>
            <Link href="/billing" className="mt-4 inline-block">
              <Button variant="secondary" size="sm">
                Manage plan
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Choose a theme, or follow your system setting.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeToggle />
          </CardContent>
        </Card>

        <Card className="border-danger/30">
          <CardHeader>
            <CardTitle className="text-danger">Delete account</CardTitle>
            <CardDescription>
              Permanently removes your account, every image you&apos;ve generated
              and all of your history. This can&apos;t be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
              Delete my account
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteAccount}
        loading={deleting}
        title="Delete your account?"
        description="Every image, prompt and credit record will be permanently erased. This cannot be undone."
        confirmLabel="Permanently delete"
      />
    </div>
  );
}
