import { redirect } from 'next/navigation';

/**
 * Root route: redirects to /notebook (the default authenticated view).
 *
 * Backward-compat: if a legacy /?page=xyz link is visited, the page query
 * parameter is forwarded so the correct note is opened immediately.
 */
type RootPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RootPage({ searchParams }: Readonly<RootPageProps>) {
  const params = await searchParams;
  const pageId = typeof params.page === 'string' ? params.page : undefined;
  redirect(pageId ? `/notebook?page=${encodeURIComponent(pageId)}` : '/notebook');
}
