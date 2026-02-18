'use client';

import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
        <h1 className="mb-2 text-center text-2xl font-semibold text-foreground">
          DevTree
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Sign in to continue to your learning workspace.
        </p>
        <button
          type="button"
          className="flex w-full items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-card dark:bg-indigo-500 dark:hover:bg-indigo-600"
          onClick={() => signIn('github', { callbackUrl: '/' })}
        >
          Continue with GitHub
        </button>
      </div>
    </div>
  );
}
