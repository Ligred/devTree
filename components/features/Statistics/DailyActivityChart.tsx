'use client';

import React, { useState } from 'react';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import { formatDateLong, formatDateShort, parseLocalDate } from '@/lib/dateUtils';

import type { ActivityDay } from './types';
import { formatDuration } from './types';

interface Props {
  data: ActivityDay[];
  loading?: boolean;
}

type View = '30' | '90';

// Use explicit hex values — CSS custom properties (oklch) are not reliably
// resolved by Recharts SVG in all browsers / render environments.
const COLORS = {
  sessionMs: '#3b82f6', // blue-500 — visible on both light and dark backgrounds
  contentEvents: '#8b5cf6', // violet-500
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  // rawDate is YYYY-MM-DD stored alongside the display label
  const rawDate: string | undefined = payload[0]?.payload?.rawDate as string | undefined;
  const dateLabel = rawDate ? formatDateLong(parseLocalDate(rawDate)) : '';
  return (
    <div className="bg-background rounded-lg border p-3 text-sm shadow-sm">
      {dateLabel && <p className="text-foreground mb-1.5 font-semibold">{dateLabel}</p>}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">
            {entry.name === 'Session time'
              ? formatDuration(entry.value as number)
              : (entry.value as number)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DailyActivityChart({ data, loading }: Props) {
  const [view, setView] = useState<View>('30');

  const sliced = data.slice(-Number(view));

  // Tick density: show ~7-8 labels regardless of window size
  const tickInterval = view === '30' ? 3 : 9;

  const displayData = sliced.map((d) => ({
    rawDate: d.date, // kept for full-date tooltip
    label: formatDateShort(parseLocalDate(d.date)), // e.g. "Feb 15"
    'Session time': d.sessionMs,
    'Content events': d.contentEvents,
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Daily Activity</CardTitle>
          <CardDescription>Session time and content changes over time</CardDescription>
        </div>
        <div className="flex gap-1 rounded-md border p-0.5 text-xs">
          {(['30', '90'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded px-2 py-1 transition-colors ${
                view === v
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {v}d
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="h-64">
        {loading ? (
          <div className="bg-muted h-full w-full animate-pulse rounded" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="sessionGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.sessionMs} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={COLORS.sessionMs} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="eventsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.contentEvents} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={COLORS.contentEvents} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                interval={tickInterval}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-muted-foreground text-xs">{value}</span>
                )}
              />
              <Area
                type="monotone"
                dataKey="Session time"
                stroke={COLORS.sessionMs}
                fill="url(#sessionGrad)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Area
                type="monotone"
                dataKey="Content events"
                stroke={COLORS.contentEvents}
                fill="url(#eventsGrad)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
