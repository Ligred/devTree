/**
 * userPreferences.ts — load and save user preferences via the API.
 *
 * Used to sync theme, locale, and feature flags (tags per page/block) to the
 * database so they follow the user across devices. When the user is logged in,
 * preferences are applied on load and persisted when they change in the UI.
 */

export type UserPreferencesPayload = {
  theme?: 'light' | 'dark' | 'system';
  locale?: 'en' | 'uk';
  tagsPerPageEnabled?: boolean;
  tagsPerBlockEnabled?: boolean;
  recordingStartSoundEnabled?: boolean;
};

/**
 * Fetch the current user's preferences from the API.
 * Returns null if not authenticated or request fails.
 */
export async function loadUserPreferences(): Promise<UserPreferencesPayload | null> {
  try {
    const res = await fetch('/api/user/preferences');
    if (!res.ok) return null;
    const data = await res.json();
    return data as UserPreferencesPayload;
  } catch {
    return null;
  }
}

/**
 * Save (merge) preferences to the API. Fire-and-forget; errors are not surfaced.
 * Call after updating theme, locale, or feature toggles in the UI.
 */
export async function saveUserPreferences(
  data: UserPreferencesPayload,
): Promise<void> {
  try {
    await fetch('/api/user/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    // Persistence is best-effort; do not block UI
  }
}
