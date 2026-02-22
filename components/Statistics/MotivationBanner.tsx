'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, Sparkles, Trophy, Zap, Star, BookOpen } from 'lucide-react';
import type { SummaryData } from './types';

interface Props {
  data: SummaryData | null;
  /**
   * Override the "already shown today" guard.
   * Useful in Storybook/tests to force the banner to render unconditionally.
   */
  forceShow?: boolean;
}

// ─── Daily messages ────────────────────────────────────────────────────────
// One message is shown per day, rotating through the list based on the day-of-year.
// They are authored messages, not AI-generated — written by the DevTree team to
// reflect real learning milestones and habits.
const DAILY_MESSAGES = [
  { text: "Every note you write is a thought made permanent.", emoji: "✍️" },
  { text: "Knowledge compounds just like interest. You're investing in yourself.", emoji: "📈" },
  { text: "The act of writing clarifies thinking. Keep going.", emoji: "💡" },
  { text: "Small, consistent steps outperform long occasional bursts.", emoji: "🐢" },
  { text: "Your notes today are the shortcuts you'll thank yourself for tomorrow.", emoji: "🗺️" },
  { text: "A second brain starts with a single note. You've already started.", emoji: "🧠" },
  { text: "Deep work leaves a trace. Your blocks are proof.", emoji: "🔬" },
  { text: "Reviewing old notes once is worth writing them ten times.", emoji: "🔁" },
  { text: "Curiosity is a muscle. You're exercising it right now.", emoji: "💪" },
  { text: "The best time to document something is right now.", emoji: "⏱️" },
  { text: "Connecting ideas is the highest form of learning.", emoji: "🕸️" },
  { text: "Great notes are great questions in disguise.", emoji: "❓" },
  { text: "You don't have to remember everything — your notes do.", emoji: "📦" },
  { text: "Progress is invisible until suddenly it isn't.", emoji: "🌅" },
  { text: "Structured thinking starts with structured notes.", emoji: "🏗️" },
  { text: "Each block you write is a brick in your knowledge base.", emoji: "🧱" },
  { text: "The learner's advantage: you never stop improving.", emoji: "🎓" },
  { text: "Document the 'why' as much as the 'how'.", emoji: "🗺️" },
  { text: "What you write today, you'll understand better next week.", emoji: "📆" },
  { text: "Habits beat motivation. Your streak is proof of that.", emoji: "🔥" },
  { text: "Consistency is the compound interest of personal growth.", emoji: "📊" },
  { text: "Your notes are your thinking made visible.", emoji: "👁️" },
  { text: "The best learning tool is the one you actually use.", emoji: "🛠️" },
  { text: "Even five minutes of focused writing moves the needle.", emoji: "📍" },
  { text: "Capture ideas fast. Refine them later. Ship knowledge today.", emoji: "🚀" },
  { text: "Writing is thinking. You're doing both right now.", emoji: "🤔" },
  { text: "Build in public starts with building in your notes.", emoji: "🏛️" },
  { text: "Every expert started by taking notes on the basics.", emoji: "📝" },
  { text: "Your knowledge base grows every time you open the app.", emoji: "🌱" },
  { text: "Today's note is tomorrow's shortcut.", emoji: "⚡" },
];

// ─── Achievement banners ────────────────────────────────────────────────────
interface AchievementDef {
  id: string;
  predicate: (d: SummaryData) => boolean;
  message: string;
  emoji: string;
  icon: React.ReactNode;
  type: 'milestone' | 'note';
}

const ACHIEVEMENT_BANNERS: AchievementDef[] = [
  {
    id: 'streak-100',
    predicate: (d) => d.streakCurrent >= 100,
    message: '100-day streak! You are a true learning champion.',
    emoji: '🏆',
    icon: <Trophy className="h-5 w-5 text-amber-500" />,
    type: 'milestone',
  },
  {
    id: 'streak-30',
    predicate: (d) => d.streakCurrent >= 30,
    message: "30 days in a row — you're unstoppable.",
    emoji: '⚡',
    icon: <Zap className="h-5 w-5 text-violet-500" />,
    type: 'milestone',
  },
  {
    id: 'streak-7',
    predicate: (d) => d.streakCurrent >= 7,
    message: '7-day streak! Consistency is the superpower of learners.',
    emoji: '🔥',
    icon: <Star className="h-5 w-5 text-orange-500" />,
    type: 'milestone',
  },
  {
    id: '50-pages',
    predicate: (d) => d.totalPages >= 50,
    message: '50 notes — your second brain is growing strong.',
    emoji: '🧠',
    icon: <BookOpen className="h-5 w-5 text-emerald-500" />,
    type: 'note',
  },
  {
    id: '10-pages',
    predicate: (d) => d.totalPages >= 10,
    message: "10 notes in! You're building a real knowledge base.",
    emoji: '📚',
    icon: <BookOpen className="h-5 w-5 text-blue-500" />,
    type: 'note',
  },
  {
    id: 'first-page',
    predicate: (d) => d.totalPages >= 1,
    message: "You've created your first note! The journey of a thousand pages begins with one.",
    emoji: '🌱',
    icon: <Sparkles className="h-5 w-5 text-green-500" />,
    type: 'note',
  },
];

// ─── Persistence logic ─────────────────────────────────────────────────────
const STORAGE_KEY = 'devtree-motivation-banner-date';

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function wasShownToday(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem(STORAGE_KEY) === getTodayKey()) return true;
    if (localStorage.getItem(STORAGE_KEY) === getTodayKey()) return true;
  } catch { /* ignore private-mode storage errors */ }
  return false;
}

function markShownToday(): void {
  try {
    const today = getTodayKey();
    sessionStorage.setItem(STORAGE_KEY, today);
    localStorage.setItem(STORAGE_KEY, today);
  } catch { /* ignore */ }
}

/** Returns 0–364 index stable per calendar day. Used to cycle daily messages. */
function dayOfYearIndex(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000) % DAILY_MESSAGES.length;
}

// ─── Celebration particles ─────────────────────────────────────────────────
const PARTICLES = ['✨', '🎉', '⭐', '🌟', '💫', '🎊'];

function CelebrationParticles() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="absolute text-lg"
          style={{
            left: `${10 + i * 14}%`,
            top: `${20 + (i % 3) * 20}%`,
            animation: `banner-float-up ${1.2 + i * 0.15}s ease-out ${i * 0.1}s both`,
          }}
        >
          {p}
        </span>
      ))}
    </div>
  );
}

// ─── Banner component ──────────────────────────────────────────────────────
export function MotivationBanner({ data, forceShow = false }: Props) {
  const [shownToday, setShownToday] = useState(true); // SSR-safe default
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (forceShow) {
      setShownToday(false);
    } else {
      setShownToday(wasShownToday());
    }
  }, [forceShow]);

  // Trigger entrance animation after mount
  useEffect(() => {
    if (!shownToday && !dismissed) {
      timerRef.current = setTimeout(() => setVisible(true), 50);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [shownToday, dismissed]);

  if (!data || shownToday || dismissed) return null;

  // Find the highest-priority achievement (array is ordered highest → lowest priority).
  // No reverse needed: first match is the most specific achievement unlocked.
  const achievement = ACHIEVEMENT_BANNERS.find((b) => b.predicate(data));
  const dailyMsg = DAILY_MESSAGES[dayOfYearIndex()];

  const isMilestone = !!achievement && achievement.type === 'milestone';
  const emoji = achievement ? achievement.emoji : dailyMsg.emoji;
  const message = achievement ? achievement.message : dailyMsg.text;
  const icon = achievement ? achievement.icon : <Sparkles className="h-4 w-4 text-violet-500" />;

  const handleDismiss = () => {
    markShownToday();
    setVisible(false);
    // Give the exit animation time before removing from DOM
    setTimeout(() => setDismissed(true), 300);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'relative overflow-hidden rounded-xl border shadow-sm transition-all duration-300',
        isMilestone
          ? 'border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-yellow-500/10'
          : 'border-violet-500/20 bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-indigo-500/5',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
      ].join(' ')}
    >
      {isMilestone && <CelebrationParticles />}

      <div className="relative flex items-start gap-3 p-4 pr-10">
        {/* Icon */}
        <div className="mt-0.5 shrink-0">{icon}</div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          {/* Label row */}
          <div className="flex items-center gap-1.5 mb-1">
            {isMilestone ? (
              <span className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                Milestone reached!
              </span>
            ) : achievement ? (
              <span className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                Achievement
              </span>
            ) : (
              <span className="text-xs text-muted-foreground/80">Daily motivation</span>
            )}
          </div>

          {/* Message */}
          <p className="text-sm font-medium text-foreground leading-snug">
            <span className="mr-1.5">{emoji}</span>
            {message}
          </p>

          {/* Source note */}
          <p className="mt-1.5 text-xs text-muted-foreground/60">
            {achievement
              ? 'Unlocked based on your learning progress ✨'
              : `Message ${dayOfYearIndex() + 1} of ${DAILY_MESSAGES.length} — rotates daily based on your calendar ✨`}
          </p>
        </div>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="absolute right-2 top-2 rounded p-1.5 text-muted-foreground hover:bg-muted/60 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
