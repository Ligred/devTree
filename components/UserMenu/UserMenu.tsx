'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Settings, User } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useI18n } from '@/lib/i18n';

type UserMenuProps = Readonly<{
  onOpenSettings: () => void;
}>;

export function UserMenu({ onOpenSettings }: UserMenuProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  // Close menu when the user scrolls anywhere on the page
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', close, { capture: true });
  }, [open]);

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={t('userMenu.label')}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <User size={18} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-40 rounded-lg border border-border bg-popover p-1 shadow-lg text-popover-foreground"
          sideOffset={6}
          align="end"
        >
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            onSelect={(e) => {
              e.preventDefault();
              onOpenSettings();
            }}
          >
            <Settings size={14} />
            {t('userMenu.settings')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
