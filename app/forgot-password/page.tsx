'use client';

import Link from 'next/link';

/** Placeholder page for password reset. Email-based reset requires an email service (Resend, SendGrid, etc.). */
export default function ForgotPasswordPage() {
  return (
    <div className="bg-muted/30 flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="border-border bg-card w-full max-w-md rounded-2xl border p-6 shadow-lg sm:p-10">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-md"
          >
            LT
          </Link>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            Forgot your password?
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Password reset is not configured yet. Please contact support or sign in with
            Google/GitHub if you previously used OAuth.
          </p>
        </div>

        <Link
          href="/login"
          className="border-border bg-background text-foreground hover:bg-accent focus:ring-ring focus:ring-offset-background flex h-11 w-full items-center justify-center rounded-lg border px-4 py-3 text-sm font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
