'use client';

import React from 'react';

import { motion, useReducedMotion } from 'motion/react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shared/ui/tooltip';
import { cn } from '@/lib/utils';

interface ActivityBarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ActivityBarItem({
  icon,
  label,
  active = false,
  disabled = false,
  onClick,
  className,
}: Readonly<ActivityBarItemProps>) {
  const reducedMotion = useReducedMotion();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          onClick={onClick}
          aria-disabled={disabled}
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          whileHover={reducedMotion || disabled ? undefined : { x: 2, scale: 1.08 }}
          whileTap={reducedMotion || disabled ? undefined : { scale: 0.94 }}
          transition={
            reducedMotion
              ? { duration: 0.01 }
              : { type: 'spring', stiffness: 520, damping: 30, mass: 0.55 }
          }
          className={cn(
            'motion-interactive icon-pop-hover relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors md:h-11 md:w-11',
            'text-muted-foreground outline-none',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:ring-ring focus-visible:ring-2',
            active && 'alive-shadow bg-accent text-accent-foreground',
            disabled && 'cursor-not-allowed opacity-40',
            className,
          )}
        >
          {/* Active indicator strip */}
          {active && (
            <span className="bg-primary absolute right-2 bottom-0 left-2 h-0.5 rounded-t-full md:top-2 md:right-auto md:bottom-2 md:left-0 md:h-auto md:w-0.5 md:rounded-t-none md:rounded-r-full" />
          )}
          <span className="flex h-5 w-5 items-center justify-center">{icon}</span>
        </motion.button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
