'use client';

import { cn } from '@/lib/utils';

export function SegmentButton({
  active,
  onClick,
  children,
}: Readonly<{ active: boolean; onClick: () => void; children: React.ReactNode }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'motion-interactive rounded-md border px-3 py-1.5 text-sm font-medium transition-all',
        'focus-visible:ring-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        active
          ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm dark:border-indigo-400 dark:bg-indigo-600'
          : 'border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {children}
    </button>
  );
}

export function SettingRow({
  label,
  description,
  children,
}: Readonly<{ label: string; description?: string; children: React.ReactNode }>) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-sm font-medium">{label}</p>
        {description && (
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SectionHeader({ title }: Readonly<{ title: string }>) {
  return (
    <h3 className="text-muted-foreground/70 mb-3 text-xs font-semibold tracking-widest uppercase">
      {title}
    </h3>
  );
}

export function VolumeControl({
  value,
  onChange,
  label,
}: Readonly<{ value: number; onChange: (value: number) => void; label: string }>) {
  const percent = Math.round(value * 100);

  return (
    <div className="flex min-w-52 items-center gap-3">
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        className="accent-primary h-1.5 w-full cursor-pointer"
      />
      <span className="text-muted-foreground w-10 text-right text-xs font-medium">{percent}%</span>
    </div>
  );
}
