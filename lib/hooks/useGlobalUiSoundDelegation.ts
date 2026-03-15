import { useEffect } from 'react';

import {
  playHoverSound,
  playTypingSound,
  playUiSound,
  primeUiSounds,
  type UiSoundEvent,
  unlockUiSoundPlayback,
} from '@/lib/stores/uiSoundEffects';

const INTERACTIVE_SELECTOR =
  'button, [role="button"], [role="tab"], [role="option"], [role="treeitem"], a[href], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="switch"], [aria-pressed]';
const TYPING_SELECTOR = 'input, textarea, [contenteditable="true"], [role="textbox"]';

const SOUND_IGNORE_SELECTOR = '[data-ui-sound-ignore="true"]';
const UI_SOUND_EVENT_DATASET_KEY = 'uiSoundEvent';

const VALID_UI_SOUND_EVENTS: ReadonlySet<UiSoundEvent> = new Set([
  'navigation',
  'open',
  'close',
  'create',
  'rename',
  'delete',
  'move',
  'select',
  'button',
  'toggleOn',
  'toggleOff',
  'disabled',
  'notification',
]);

function isUiSoundEvent(value: string | undefined): value is UiSoundEvent {
  return value !== undefined && VALID_UI_SOUND_EVENTS.has(value as UiSoundEvent);
}

function hasSoundIgnore(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(SOUND_IGNORE_SELECTOR) !== null;
}

function findInteractiveTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  if (hasSoundIgnore(target)) return null;
  return target.closest(INTERACTIVE_SELECTOR);
}

function findTypingTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  if (hasSoundIgnore(target)) return null;
  return target.closest(TYPING_SELECTOR);
}

function resolveUiSoundEvent(element: HTMLElement): UiSoundEvent {
  const eventFromData = element.dataset[UI_SOUND_EVENT_DATASET_KEY];
  if (isUiSoundEvent(eventFromData)) {
    return eventFromData;
  }

  if (
    element.matches(':disabled') ||
    element.getAttribute('aria-disabled') === 'true' ||
    element.dataset.disabled === 'true'
  ) {
    return 'disabled';
  }

  if (element.getAttribute('role') === 'switch') {
    return element.getAttribute('aria-checked') === 'true' ? 'toggleOff' : 'toggleOn';
  }

  return 'button';
}

export function useGlobalUiSoundDelegation(): void {
  useEffect(() => {
    primeUiSounds();

    let lastHoverSoundAt = 0;
    let lastTypingSoundAt = 0;

    const handleUserActivation = () => {
      unlockUiSoundPlayback();
    };

    const handlePointerDown = (event: PointerEvent) => {
      unlockUiSoundPlayback();

      if (event.button !== 0) return;
      const interactive = findInteractiveTarget(event.target);
      if (!interactive) return;

      playUiSound(resolveUiSoundEvent(interactive));
    };

    const handlePointerOver = (event: PointerEvent) => {
      const interactive = findInteractiveTarget(event.target);
      if (!interactive) return;

      const previousInteractive = findInteractiveTarget(event.relatedTarget);
      if (previousInteractive === interactive) return;

      const now = Date.now();
      if (now - lastHoverSoundAt < 40) return;

      lastHoverSoundAt = now;
      playHoverSound();
    };

    const handleTypingKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const typingTarget = findTypingTarget(event.target);
      if (!typingTarget) return;

      const isTypingKey =
        event.key.length === 1 ||
        event.key === 'Backspace' ||
        event.key === 'Delete' ||
        event.key === 'Enter';
      if (!isTypingKey) return;

      const now = Date.now();
      if (now - lastTypingSoundAt < 90) return;

      lastTypingSoundAt = now;
      playTypingSound();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      unlockUiSoundPlayback();

      if (event.defaultPrevented) return;
      if (event.repeat) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const interactive = findInteractiveTarget(event.target);
      if (!interactive) return;

      playUiSound(resolveUiSoundEvent(interactive));
    };

    document.addEventListener('pointerdown', handleUserActivation, {
      capture: true,
      passive: true,
    });
    document.addEventListener('keydown', handleUserActivation, { capture: true });
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('pointerover', handlePointerOver, { passive: true });
    document.addEventListener('keydown', handleTypingKeyDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handleUserActivation, { capture: true });
      document.removeEventListener('keydown', handleUserActivation, { capture: true });
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('pointerover', handlePointerOver);
      document.removeEventListener('keydown', handleTypingKeyDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
