'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { StatsSummaryCards } from '@/components/Statistics/StatsSummaryCards';
import { StreakCard } from '@/components/Statistics/StreakCard';
import { DailyActivityChart } from '@/components/Statistics/DailyActivityChart';
import { TopicsBarChart } from '@/components/Statistics/TopicsBarChart';
import { ContentTypeDonut } from '@/components/Statistics/ContentTypeDonut';
import { ActivityHeatmap } from '@/components/Statistics/ActivityHeatmap';
import { MotivationBanner } from '@/components/Statistics/MotivationBanner';
import { useStatsStore } from '@/lib/statsStore';
import type { ActivityDay, ContentData, SummaryData, TopicData } from '@/components/Statistics/types';

/** Safely decode a fetch Response as JSON, throwing if the response is not OK. */
async function safeJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export default function StatisticsPage() {
  const { status } = useSession();
  const router = useRouter();
  const { enabled: statisticsEnabled } = useStatsStore();

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [content, setContent] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect to notebook if stats are disabled
  useEffect(() => {
    if (!statisticsEnabled) router.replace('/notebook');
  }, [statisticsEnabled, router]);

  // Auth guard
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  // Data fetching — request 365 days so the heatmap can show a full year
  useEffect(() => {
    if (status !== 'authenticated' || !statisticsEnabled) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [summaryRes, activityRes, topicsRes, contentRes] = await Promise.all([
          fetch('/api/stats/summary'),
          fetch('/api/stats/activity?days=365'),
          fetch('/api/stats/topics'),
          fetch('/api/stats/content'),
        ]);

        const [summaryData, activityData, topicsData, contentData] = await Promise.all([
          safeJson<SummaryData>(summaryRes),
          safeJson<ActivityDay[]>(activityRes),
          safeJson<TopicData[]>(topicsRes),
          safeJson<ContentData>(contentRes),
        ]);

        setSummary(summaryData);
        setActivity(activityData);
        setTopics(topicsData);
        setContent(contentData);
      } catch (err) {
        console.error('Failed to load statistics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load statistics data.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [status, statisticsEnabled]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
    );
  }

  if (!statisticsEnabled) return null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl space-y-6 p-6 lg:p-8">
          {/* Page title */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Statistics</h1>
            <p className="text-sm text-muted-foreground">
              Track your learning progress and habits
            </p>
          </div>

          {/* Motivation banner — shown once per day, dismissed per session */}
          <MotivationBanner data={summary} />

          {/* Error state */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              <strong className="font-medium">Failed to load statistics: </strong>{error}
            </div>
          )}

          {/* Summary cards (2×2) + Streak card — same row, same height */}
          <div className="grid gap-4 lg:grid-cols-5 lg:items-stretch">
            <div className="lg:col-span-4 lg:h-full">
              <StatsSummaryCards data={summary} loading={loading} />
            </div>
            <div className="lg:col-span-1 lg:h-full">
              <StreakCard data={summary} loading={loading} />
            </div>
          </div>

          {/* Daily activity chart */}
          <DailyActivityChart data={activity} loading={loading} />

          {/* Topics + Block type distribution */}
          <div className="grid gap-4 lg:grid-cols-2">
            <TopicsBarChart data={topics} loading={loading} />
            <ContentTypeDonut data={content} loading={loading} />
          </div>

          {/* Activity heatmap — uses all 365 days */}
          <ActivityHeatmap data={activity} loading={loading} />
        </div>
      </div>
    </div>
  );
}
