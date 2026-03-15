import DiaryPageClient from '@/components/features/diary/DiaryPageClient';

export default function DiaryPage() {
  // server component; diary-specific rendering happens in client component
  return <DiaryPageClient />;
}
