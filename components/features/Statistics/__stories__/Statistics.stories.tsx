/**
 * Stories for Statistics feature components.
 *
 * Uses realistic sample data closely mirroring what the API would return so
 * designers can review the visualizations without a running database.
 */
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ActivityHeatmap } from '@/components/features/Statistics/ActivityHeatmap';
import { ContentTypeDonut } from '@/components/features/Statistics/ContentTypeDonut';
import { DailyActivityChart } from '@/components/features/Statistics/DailyActivityChart';
import { MotivationBanner } from '@/components/features/Statistics/MotivationBanner';
import { StatsSummaryCards } from '@/components/features/Statistics/StatsSummaryCards';
import { StreakCard } from '@/components/features/Statistics/StreakCard';
import { TopicsBarChart } from '@/components/features/Statistics/TopicsBarChart';
import type {
  ActivityDay,
  ContentData,
  SummaryData,
  TopicData,
} from '@/components/features/Statistics/types';

// ─── Sample data ───────────────────────────────────────────────────────────

const sampleSummaryBase: SummaryData = {
  totalPages: 42,
  totalBlocks: 318,
  totalSessionTimeMs: 5 * 60 * 60 * 1000, // 5h
  totalWritingTimeMs: 2.5 * 60 * 60 * 1000, // 2h 30m → 50% focus
  streakCurrent: 7,
  streakLongest: 30,
  achievements: ['7-day streak', '100 blocks'],
};

/** No activity yet — edge case. */
const sampleSummaryEmpty: SummaryData = {
  totalPages: 0,
  totalBlocks: 0,
  totalSessionTimeMs: 0,
  totalWritingTimeMs: 0,
  streakCurrent: 0,
  streakLongest: 0,
  achievements: [],
};

/** Just crossed first note milestone. */
const sampleSummaryFirstNote: SummaryData = {
  ...sampleSummaryBase,
  totalPages: 1,
  streakCurrent: 0,
};

/** 7-day streak milestone. */
const sampleSummaryStreak7: SummaryData = {
  ...sampleSummaryBase,
  streakCurrent: 7,
  streakLongest: 7,
};

/** 30-day streak milestone. */
const sampleSummaryStreak30: SummaryData = {
  ...sampleSummaryBase,
  streakCurrent: 30,
  streakLongest: 30,
};

/** 100-day streak — champion. */
const sampleSummaryStreak100: SummaryData = {
  ...sampleSummaryBase,
  streakCurrent: 100,
  streakLongest: 100,
  achievements: ['100-day streak', '1000 blocks', 'Power user'],
};

/** Beyond all milestones. */
const sampleSummaryStreak365: SummaryData = {
  ...sampleSummaryBase,
  streakCurrent: 365,
  streakLongest: 365,
};

/** 50 notes milestone. */
const sampleSummary50Pages: SummaryData = {
  ...sampleSummaryBase,
  totalPages: 50,
  streakCurrent: 2,
};

/** Deterministic pseudo-random in [0, 1) based on a seed (Knuth multiplicative hash). */
function stableRand(seed: number): number {
  return ((seed * 2654435761) >>> 0) / 0xffffffff;
}

/** Generate `n` days of activity going backwards from today. */
function generateActivityDays(n: number): ActivityDay[] {
  const days: ActivityDay[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    days.push({
      date: dateStr!,
      sessionMs: isWeekend ? 0 : Math.floor(stableRand(i) * 3_600_000),
      pagesVisited: isWeekend ? 0 : Math.floor(stableRand(i + 1000) * 8),
      contentEvents: isWeekend ? 0 : Math.floor(stableRand(i + 2000) * 20),
    });
  }
  return days;
}

const sampleActivity90 = generateActivityDays(90);
const sampleActivity0: ActivityDay[] = [];

const sampleTopics: TopicData[] = [
  { folderId: '1', folderName: 'Frontend', timeSpentMs: 2_400_000, pageCount: 12, eventCount: 87 },
  { folderId: '2', folderName: 'Backend', timeSpentMs: 1_200_000, pageCount: 6, eventCount: 43 },
  {
    folderId: '3',
    folderName: 'Design Systems',
    timeSpentMs: 900_000,
    pageCount: 4,
    eventCount: 22,
  },
  { folderId: '4', folderName: 'DevOps', timeSpentMs: 450_000, pageCount: 3, eventCount: 11 },
  { folderId: '5', folderName: 'Personal', timeSpentMs: 180_000, pageCount: 2, eventCount: 5 },
];

const sampleContent: ContentData = {
  blockTypeCounts: {
    text: 120,
    code: 85,
    heading: 60,
    list: 30,
    diagram: 15,
    image: 8,
  },
  eventTypeCounts: {
    PAGE_VIEWED: 250,
    BLOCK_ADDED: 318,
    BLOCK_EDITED: 1200,
    PAGE_CREATED: 42,
  },
  creationTimeline: Array.from({ length: 12 }, (_, i) => ({
    week: new Date(Date.now() - (11 - i) * 7 * 86_400_000).toISOString().split('T')[0]!,
    count: Math.floor(stableRand(i + 3000) * 30) + 1,
  })),
};

// ─── StatsSummaryCards ──────────────────────────────────────────────────────

const summaryMeta: Meta<typeof StatsSummaryCards> = {
  title: 'Statistics/StatsSummaryCards',
  component: StatsSummaryCards,
  parameters: { layout: 'padded' },
};

export default summaryMeta;

type SummaryStory = StoryObj<typeof StatsSummaryCards>;

export const Populated: SummaryStory = {
  args: { data: sampleSummaryBase, loading: false },
};

export const EmptyUser: SummaryStory = {
  name: 'StatsSummaryCards / New user (no data)',
  args: { data: sampleSummaryEmpty, loading: false },
};

export const Loading: SummaryStory = {
  args: { data: null, loading: true },
};

export const NoData: SummaryStory = {
  args: { data: null, loading: false },
};

export const ApproachingMilestone: SummaryStory = {
  name: 'StatsSummaryCards / Approaching milestone',
  args: {
    data: { ...sampleSummaryBase, totalPages: 8, totalBlocks: 36, totalWritingTimeMs: 45 * 60_000 },
    loading: false,
  },
};

export const RichNotes: SummaryStory = {
  name: 'StatsSummaryCards / Rich notes (high richness)',
  args: {
    data: {
      ...sampleSummaryBase,
      totalPages: 20,
      totalBlocks: 200,
      totalWritingTimeMs: 8 * 3_600_000,
    },
    loading: false,
  },
};

// ─── StreakCard ─────────────────────────────────────────────────────────────

export const StreakCardNoStreak: StoryObj<typeof StreakCard> = {
  render: () => <StreakCard data={sampleSummaryEmpty} loading={false} />,
  name: 'StreakCard / No streak yet',
  parameters: { layout: 'centered' },
};

export const StreakCardDay1: StoryObj<typeof StreakCard> = {
  render: () => (
    <StreakCard
      data={{ ...sampleSummaryBase, streakCurrent: 1, streakLongest: 1 }}
      loading={false}
    />
  ),
  name: 'StreakCard / Day 1',
  parameters: { layout: 'centered' },
};

export const StreakCardStreak7: StoryObj<typeof StreakCard> = {
  render: () => <StreakCard data={sampleSummaryStreak7} loading={false} />,
  name: 'StreakCard / 7-day milestone',
  parameters: { layout: 'centered' },
};

export const StreakCardStreak30: StoryObj<typeof StreakCard> = {
  render: () => <StreakCard data={sampleSummaryStreak30} loading={false} />,
  name: 'StreakCard / 30-day milestone',
  parameters: { layout: 'centered' },
};

export const StreakCardStreak100: StoryObj<typeof StreakCard> = {
  render: () => <StreakCard data={sampleSummaryStreak100} loading={false} />,
  name: 'StreakCard / 100-day champion',
  parameters: { layout: 'centered' },
};

export const StreakCardStreak365: StoryObj<typeof StreakCard> = {
  render: () => <StreakCard data={sampleSummaryStreak365} loading={false} />,
  name: 'StreakCard / 365-day legendary',
  parameters: { layout: 'centered' },
};

export const StreakCardLoading: StoryObj<typeof StreakCard> = {
  render: () => <StreakCard data={null} loading={true} />,
  name: 'StreakCard / Loading',
  parameters: { layout: 'centered' },
};

// ─── DailyActivityChart ─────────────────────────────────────────────────────

export const ActivityChartWithData: StoryObj<typeof DailyActivityChart> = {
  render: () => <DailyActivityChart data={sampleActivity90} loading={false} />,
  name: 'DailyActivityChart / 90 days of data',
  parameters: { layout: 'padded' },
};

export const ActivityChartEmpty: StoryObj<typeof DailyActivityChart> = {
  render: () => <DailyActivityChart data={sampleActivity0} loading={false} />,
  name: 'DailyActivityChart / No data yet',
  parameters: { layout: 'padded' },
};

export const ActivityChartLoading: StoryObj<typeof DailyActivityChart> = {
  render: () => <DailyActivityChart data={[]} loading={true} />,
  name: 'DailyActivityChart / Loading',
  parameters: { layout: 'padded' },
};

// ─── TopicsBarChart ─────────────────────────────────────────────────────────

export const TopicsChartWithData: StoryObj<typeof TopicsBarChart> = {
  render: () => <TopicsBarChart data={sampleTopics} loading={false} />,
  name: 'TopicsBarChart / With data',
  parameters: { layout: 'padded' },
};

export const TopicsChartEmpty: StoryObj<typeof TopicsBarChart> = {
  render: () => <TopicsBarChart data={[]} loading={false} />,
  name: 'TopicsBarChart / No folders',
  parameters: { layout: 'padded' },
};

export const TopicsChartLoading: StoryObj<typeof TopicsBarChart> = {
  render: () => <TopicsBarChart data={[]} loading={true} />,
  name: 'TopicsBarChart / Loading',
  parameters: { layout: 'padded' },
};

// ─── ContentTypeDonut ──────────────────────────────────────────────────────

export const DonutWithData: StoryObj<typeof ContentTypeDonut> = {
  render: () => <ContentTypeDonut data={sampleContent} loading={false} />,
  name: 'ContentTypeDonut / With data',
  parameters: { layout: 'centered' },
};

export const DonutSingleType: StoryObj<typeof ContentTypeDonut> = {
  render: () => (
    <ContentTypeDonut data={{ ...sampleContent, blockTypeCounts: { text: 42 } }} loading={false} />
  ),
  name: 'ContentTypeDonut / Single block type',
  parameters: { layout: 'centered' },
};

export const DonutLoading: StoryObj<typeof ContentTypeDonut> = {
  render: () => <ContentTypeDonut data={null} loading={true} />,
  name: 'ContentTypeDonut / Loading',
  parameters: { layout: 'centered' },
};

export const DonutEmpty: StoryObj<typeof ContentTypeDonut> = {
  render: () => (
    <ContentTypeDonut data={{ ...sampleContent, blockTypeCounts: {} }} loading={false} />
  ),
  name: 'ContentTypeDonut / No blocks yet',
  parameters: { layout: 'centered' },
};

// ─── ActivityHeatmap ────────────────────────────────────────────────────────

export const HeatmapWithData: StoryObj<typeof ActivityHeatmap> = {
  render: () => <ActivityHeatmap data={sampleActivity90} loading={false} />,
  name: 'ActivityHeatmap / 90 days of data',
  parameters: { layout: 'padded' },
};

export const HeatmapEmpty: StoryObj<typeof ActivityHeatmap> = {
  render: () => <ActivityHeatmap data={[]} loading={false} />,
  name: 'ActivityHeatmap / Empty',
  parameters: { layout: 'padded' },
};

// ─── MotivationBanner ───────────────────────────────────────────────────────
// All stories use forceShow={true} so they render regardless of dismissal state.

export const BannerDailyMessage: StoryObj<typeof MotivationBanner> = {
  render: () => <MotivationBanner data={sampleSummaryBase} forceShow />,
  name: 'MotivationBanner / Daily message (no achievement)',
  parameters: { layout: 'padded' },
};

export const BannerFirstNote: StoryObj<typeof MotivationBanner> = {
  render: () => <MotivationBanner data={sampleSummaryFirstNote} forceShow />,
  name: 'MotivationBanner / Achievement — first note',
  parameters: { layout: 'padded' },
};

export const BannerStreak7: StoryObj<typeof MotivationBanner> = {
  render: () => <MotivationBanner data={sampleSummaryStreak7} forceShow />,
  name: 'MotivationBanner / Achievement — 7-day streak',
  parameters: { layout: 'padded' },
};

export const BannerStreak30: StoryObj<typeof MotivationBanner> = {
  render: () => <MotivationBanner data={sampleSummaryStreak30} forceShow />,
  name: 'MotivationBanner / Achievement — 30-day streak',
  parameters: { layout: 'padded' },
};

export const BannerStreak100Milestone: StoryObj<typeof MotivationBanner> = {
  render: () => <MotivationBanner data={sampleSummaryStreak100} forceShow />,
  name: 'MotivationBanner / Milestone — 100-day (celebration)',
  parameters: { layout: 'padded' },
};

export const Banner50Pages: StoryObj<typeof MotivationBanner> = {
  render: () => <MotivationBanner data={sampleSummary50Pages} forceShow />,
  name: 'MotivationBanner / Achievement — 50 notes',
  parameters: { layout: 'padded' },
};

export const BannerNoData: StoryObj<typeof MotivationBanner> = {
  render: () => <MotivationBanner data={null} forceShow />,
  name: 'MotivationBanner / No data (renders nothing)',
  parameters: { layout: 'padded' },
};

export const BannerNewUser: StoryObj<typeof MotivationBanner> = {
  render: () => <MotivationBanner data={sampleSummaryEmpty} forceShow />,
  name: 'MotivationBanner / New user — daily message only',
  parameters: { layout: 'padded' },
};
