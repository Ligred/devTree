'use client';

/**
 * UnsavedChangesDialog — shown when a user tries to navigate away from a page
 * that has unsaved edits.
 *
 * ─── THREE CHOICES ────────────────────────────────────────────────────────────
 *
 *  1. "Save & leave"        — persist current changes, then navigate.
 *  2. "Leave without saving" — discard changes, navigate immediately.
 *  3. "Stay on page"        — close the dialog, return to editing.
 *
 * WHY three options instead of just "Save / Discard"?
 *   A "Cancel" (stay) option follows the user's mental model: they may have
 *   accidentally clicked the wrong page, or they may want to finish editing
 *   before leaving. Without "Stay on page", users who mis-click lose control.
 *
 * ─── DESIGN ───────────────────────────────────────────────────────────────────
 *
 *  • Uses Radix AlertDialog for accessible keyboard / focus-trap behaviour.
 *  • The destructive action ("Leave without saving") is visually de-emphasised
 *    with a secondary/ghost style to prevent accidental clicks.
 *  • "Save & leave" is the primary CTA (indigo filled) — data preservation is
 *    the safest default.
 *
 * ─── PROP CONTRACT ────────────────────────────────────────────────────────────
 *
 *  open             — whether the dialog is visible.
 *  onSaveAndLeave   — async callback: save, then navigate.
 *  onLeaveWithout   — callback: discard changes, navigate.
 *  onCancel         — callback: close dialog, stay on current page.
 */

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useI18n } from '@/lib/i18n';

type UnsavedChangesDialogProps = Readonly<{
  open: boolean;
  onSaveAndLeave: () => Promise<void>;
  onLeaveWithout: () => void;
  onCancel: () => void;
}>;

export function UnsavedChangesDialog({
  open,
  onSaveAndLeave,
  onLeaveWithout,
  onCancel,
}: UnsavedChangesDialogProps) {
  const { t } = useI18n();

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('unsaved.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('unsaved.message')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          {/* Primary: Save & leave — safest action */}
          <button
            type="button"
            data-testid="unsaved-save-and-leave"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            onClick={() => void onSaveAndLeave()}
          >
            {t('unsaved.saveAndLeave')}
          </button>

          {/* Destructive: discard changes */}
          <button
            type="button"
            data-testid="unsaved-leave-without-saving"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-destructive shadow-sm transition-colors hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2"
            onClick={onLeaveWithout}
          >
            {t('unsaved.leaveWithoutSaving')}
          </button>

          {/* Cancel: stay on page */}
          <button
            type="button"
            data-testid="unsaved-cancel"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={onCancel}
          >
            {t('unsaved.cancel')}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
