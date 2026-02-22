/**
 * Stories for Statistics feature components.
 *
 * Uses realistic sample data closely mirroring what the API would return so
 * designers can review the visualizations without a running database.
 */
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StatsSummaryCards } from '@/components/Statistics/StatsSummaryCards';
import { StreakCard } from '@/components/Statistics/StreakCard';
import { DailyActivityChart } from '@/components/Statistics/DailyActivityChart';
import { TopicsBarChart } from '@/components/Statistics/TopicsBarChart';
import { ContentTypeDonut } from '@/components/Statistics/ContentTypeDonut';
import { ActivityHeatmap } from '@/components/Statistics/ActivityHeatmap';
import { MotivationBanner } from '@/components/Statistics/MotivationBanner';
import type { ActivityDay, ContentData, SummaryData, TopicData } from '@/components/Statistics/types';

// ─── Sample data ───────────────────────────────────────────────────────────

const sampleSummary: SummaryData = {
  totalPages: 42,
  totalBlocks: 318,
  totalSessionTimeMs: 5 * 60 * 60 * 1000, // 5 hours
  totalWritingTimeMs: 2.5 * 60 * 60 * 1000, // 2.5 hours
  streakCurrent: 7,
  streakLongest: 30,
  achievements: ['7-day streak', '100 blocks'],
};

const sampleSummaryLong: SummaryData = {
  ...sampleSummary,
  streakCurrent: 100,
  streakLongest: 100,
  achievements: ['100-day streak', '1000 blocks', 'Power user'],
};

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
      date: dateStr,
      sessionMs: isWeekend ? 0 : Math.floor(Math.random() * 3_600_000),
      pagesVisited: isWeekend ? 0 : Math.floor(Math.random() * 8),
      contentEvents: isWeekend ? 0 : Math.floor(Math.random() * 20),
    });
  }
  return days;
}

const sampleActivity90 = generateActivityDays(90);
const sampleActivity0: ActivityDay[] = []; // no activity yet

const sampleTopics: TopicData[] = [
  { folderId: '1', folderName: 'Frontend', timeSpentMs: 2_400_000, pageCount: 12, eventCount: 87 },
  { folderId: '2', folderName: 'Backend', timeSpentMs: 1_200_000, pageCount: 6, eventCount: 43 },
  { folderId: '3', folderName: 'Design Systems', timeSpentMs: 900_000, pageCount: 4, eventCount: 22 },
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
    week: new Date(Date.now() - (11 - i) * 7 * 86_400_000).toISOString().split('T')[0],
    count: Math.floor(Math.random() * 30) + 1,
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
  args: { data: sampleSummary, loading: false },
};

export const Loading: SummaryStory = {
  args: { data: null, loading: true },
};

export const NoData: SummaryStory = {
  args: { data: null, loading: false },
};

// ─── StreakCard ─────────────────────────────────────────────────────────────

export const StreakCardPopulated: StoryObj<typeof StreakCard> = {
  render: () => <StreakCard data={sampleSummary} loading={false} />,
  name: 'StreakCard / Populated',
  parameters: { layout: 'centered' },
};

export const StreakCardMilestone: StoryObj<typeof StreakCard> = {
  render: () => <StreakCard data={sampleSummaryLong} loading={false} />,
  name: 'StreakCard / 100-day milestone',
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

export const DonutLoading: StoryObj<typeof ContentTypeDonut> = {
  render: () => <ContentTypeDonut data={null} loading={true} />,
  name: 'ContentTypeDonut / Loading',
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

export const BannerWithAchievements: StoryObj<typeof MotivationBanner> = {
  render: () => <MotivationBanner data={sampleSummary} />,
  name: 'MotivationBanner / With achievements',
  parameters: { layout: 'padded' },
};

export const BannerNoAchievements: StoryObj<typeof MotivationBanner> = {
  render: () => <MotivationBanner data={{ ...sampleSummary, achievements: [] }} />,
  name: 'MotivationBanner / No achievements',
  parameters: { layout: 'padded' },
};

export const BannerNull: StoryObj<typeof MotivationBanner> = {
  render: () => <MotivationBanner data={null} />,
  name: 'MotivationBanner / No data',
  parameters: { layout: 'padded' },
};
