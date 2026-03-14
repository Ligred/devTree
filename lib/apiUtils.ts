import { prisma } from '@/lib/prisma';

export function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export function normalizeTags(raw: unknown[]): string[] {
  return raw
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.toLowerCase().trim())
    .filter(Boolean);
}

export async function getOwnedPage(pageId: string, userId: string, includeBlocks = false) {
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    include: includeBlocks ? { blocks: { orderBy: { order: 'asc' } } } : undefined,
  });
  if (!page || page.ownerId !== userId) return null;
  return page;
}
