/**
 * settingsStore.ts — Global application settings managed with Zustand.
 *
 * ─── WHY ZUSTAND? ─────────────────────────────────────────────────────────────
 *
 * Zustand is a minimal, hook-based state management library (~2 KB gzipped).
 * It avoids the boilerplate of Redux (no actions/reducers) while being more
 * predictable than React Context (no re-render cascades when only one slice
 * of state changes, because Zustand uses a subscription model with selectors).
 *
 * Alternatives considered:
 *   - React Context: fine for infrequently-changing values (theme, locale) but
 *     triggers a full subtree re-render on any state change, which makes it
 *     unsuitable for frequently-read settings spread across many components.
 *   - Redux Toolkit: powerful but heavy (~47 KB) and introduces significant
 *     boilerplate for what is essentially a handful of boolean toggles.
 *   - Jotai / Recoil: atom-based, good alternatives; Zustand wins on simplicity
 *     for a flat settings object.
 *
 * ─── WHY NOT STORE THEME / LANGUAGE HERE? ────────────────────────────────────
 *
 * Theme is managed by `next-themes` (persists to localStorage under 'theme').
 * Language is managed by `lib/i18n` (persists to localStorage under 'language').
 * Duplicating these in Zustand would create two sources of truth and risk
 * desync bugs. Zustand only owns settings that aren't already managed elsewhere.
 *
 * ─── FORM STRATEGY NOTE ───────────────────────────────────────────────────────
 *
 * The app currently has two types of user input:
 *
 * 1. Block content editing (TextBlock, CodeBlock, etc.)
 *    Uses direct `onChange` callbacks with local state. This is the RIGHT
 *    pattern for real-time collaborative-style editing — changes are streamed
 *    out immediately, not batched into a "form submission". Adding react-hook-form
 *    here would add unnecessary overhead and a submission lifecycle that doesn't
 *    fit the use case.
 *
 * 2. Settings / preferences (this file)
 *    Uses Zustand directly. Settings are simple toggles / selects with no
 *    validation needed. No form library is required.
 *
 * 3. FUTURE: structured forms (login, user profile, comments)
 *    Recommendation: add `react-hook-form` (v7+) at that point. Reasons:
 *      - Mature and battle-tested (10M+ weekly npm downloads)
 *      - TypeScript-first with excellent Zod integration for schema validation
 *      - ~9 KB gzipped (vs TanStack Form at similar size but less community)
 *      - Native uncontrolled input model is more performant than TanStack Form's
 *        controlled approach for large forms
 *    TanStack Form is an excellent option if you need framework-agnostic code
 *    (e.g., shared validation logic between React and React Native), but for a
 *    Next.js-only project react-hook-form is the pragmatic choice.
 *
 * ─── PERSISTENCE ──────────────────────────────────────────────────────────────
 *
 * The `persist` middleware serializes the store to `localStorage` under the key
 * `learning-tree-settings`. In the future this can be replaced with a server-
 * side API call (see `partialize` option to choose which keys to sync) so
 * settings follow the user across devices.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

type SettingsState = {
  /**
   * Whether the per-page tag bar is visible.
   * When false, the TagBar below the page title is hidden and the sidebar
   * tag cloud is not rendered. Disabling is useful for a distraction-free
   * reading experience.
   */
  tagsPerPageEnabled: boolean;

  /**
   * Whether per-block tags are visible and editable.
   * When false, the BlockTagRow above each block content area is hidden.
   * Block tags are still stored in the data — disabling this is purely
   * a display preference, no data is lost.
   */
  tagsPerBlockEnabled: boolean;

  // ─── Actions ──────────────────────────────────────────────────────────────

  setTagsPerPage: (enabled: boolean) => void;
  setTagsPerBlock: (enabled: boolean) => void;
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      tagsPerPageEnabled: true,
      tagsPerBlockEnabled: true,

      setTagsPerPage: (tagsPerPageEnabled) => set({ tagsPerPageEnabled }),
      setTagsPerBlock: (tagsPerBlockEnabled) => set({ tagsPerBlockEnabled }),
    }),
    {
      /**
       * localStorage key.
       *
       * Using a namespaced key avoids collisions with other apps running on
       * the same origin (e.g. localhost:3000 during development).
       */
      name: 'learning-tree-settings',
    },
  ),
);
