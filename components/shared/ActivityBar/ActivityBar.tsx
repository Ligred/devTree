'use client';

import React from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { motion, useReducedMotion } from 'motion/react';
import { BarChart2, BookHeart, BookOpen, Settings } from 'lucide-react';

import { useSettingsDialog } from '@/components/features/SettingsDialog/useSettingsDialog';
import { TooltipProvider } from '@/components/shared/ui/tooltip';
import { getLastNotebookPageId } from '@/lib/notebookPageMemory';
import { useStatsStore } from '@/lib/statsStore';

import { ActivityBarItem } from './ActivityBarItem';

const TOP_ITEMS = [
  {
    id: 'notebook',
    label: 'Notebook',
    icon: <BookOpen size={20} />,
    href: '/notebook',
  },
  {
    id: 'statistics',
    label: 'Statistics',
    icon: <BarChart2 size={20} />,
    href: '/statistics',
  },
  {
    id: 'diary',
    label: 'Diary (coming soon)',
    icon: <BookHeart size={20} />,
    href: null,
    disabled: true,
  },
] as const;

export function ActivityBar() {
  const pathname = usePathname();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { openSettings } = useSettingsDialog();
  const { enabled: statisticsEnabled } = useStatsStore();

  /** Determine active section from current pathname */
  const activeId = (() => {
    if (pathname === '/' || pathname === '' || pathname.startsWith('/notebook')) return 'notebook';
    if (pathname.startsWith('/statistics')) return 'statistics';
    return 'notebook';
  })();

  const visibleItems = TOP_ITEMS.filter(
    (item) => !(item.id === 'statistics' && !statisticsEnabled),
  );

  const navigateToSection = (item: (typeof TOP_ITEMS)[number]) => {
    if (!item.href) return;

    if (item.id === 'notebook') {
      const lastPageId = getLastNotebookPageId();
      if (lastPageId) {
        router.push(`/notebook?page=${encodeURIComponent(lastPageId)}`);
        return;
      }
    }

    router.push(item.href);
  };

  return (
    <TooltipProvider>
      <motion.nav
        key={`activity-bar-${activeId}`}
        aria-label="Application sections"
        className="alive-surface bg-background flex h-12 w-full shrink-0 flex-row items-center gap-1 overflow-x-auto overflow-y-hidden border-b px-2 [scrollbar-width:none] md:h-full md:w-12 md:flex-col md:overflow-visible md:border-r md:border-b-0 md:px-0 md:py-2"
        style={{ WebkitOverflowScrolling: 'touch' }}
        initial={reducedMotion ? false : { x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={reducedMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 360, damping: 30, mass: 0.9 }}
      >
        {/* Top section items */}
        <div className="flex flex-none flex-row items-center gap-1 md:flex-1 md:flex-col">
          {visibleItems.map((item) => (
            <ActivityBarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeId === item.id}
              disabled={'disabled' in item ? item.disabled : false}
              onClick={() => {
                if ('disabled' in item && item.disabled) return;
                navigateToSection(item);
              }}
            />
          ))}
        </div>

        {/* Pinned bottom: Settings */}
        <ActivityBarItem
          icon={<Settings size={20} />}
          label="Settings"
          onClick={() => {
            openSettings();
          }}
        />
      </motion.nav>
    </TooltipProvider>
  );
}
