import { Workspace } from '@/components/Workspace';

type PageProps = {
  params: Promise<{ pageId: string }>;
};

export default async function PageByIdRoute({ params }: Readonly<PageProps>) {
  const { pageId } = await params;
  return <Workspace initialRoutePageId={pageId} />;
}
