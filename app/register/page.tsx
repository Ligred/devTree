'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Register is handled on the login page (mode=register). Redirect so /register still works. */
export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login?mode=register');
  }, [router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Redirecting to sign up…</p>
    </div>
  );
}
