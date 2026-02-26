'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

/** Register is handled on the login page (mode=register). Redirect so /register still works. */
export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login?mode=register');
  }, [router]);

  return (
    <div className="bg-background flex min-h-dvh items-center justify-center">
      <p className="text-muted-foreground text-sm">Redirecting to sign up…</p>
    </div>
  );
}
