'use client';

import { useEffect, useRef, useState } from 'react';

import { useSession } from 'next-auth/react';
import Image from 'next/image';

import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { SettingRow } from './settingsShared';

function getInitials(user: { name?: string | null; email?: string | null }) {
  if (user?.name) {
    const parts = user.name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts.at(-1)![0]).toUpperCase();
    return user.name.slice(0, 2).toUpperCase();
  }
  if (user?.email) return user.email.slice(0, 2).toUpperCase();
  return '?';
}

type Props = Readonly<{ open: boolean }>;

export function SettingsAccountTab({ open }: Props) {
  const { t } = useI18n();
  const { data: session, update: updateSession } = useSession();
  const user = session?.user;
  const initials = user ? getInitials(user) : '?';

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(user?.name ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<'saved' | 'error' | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing displayName when dialog opens
    if (open && user?.name !== undefined) setDisplayName(user.name ?? '');
  }, [open, user?.name]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileMessage(null);
    setProfileSaving(true);
    try {
      const formData = new FormData();
      formData.set('avatar', file);
      const res = await fetch('/api/user/avatar', { method: 'POST', body: formData });
      if (!res.ok) {
        await res.json().catch(() => ({}));
        setProfileMessage('error');
        setProfileSaving(false);
        return;
      }
      await updateSession();
      setProfileMessage('saved');
    } catch {
      setProfileMessage('error');
    }
    setProfileSaving(false);
    e.target.value = '';
  };

  const handleRemoveAvatar = async () => {
    setProfileMessage(null);
    setProfileSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: null }),
      });
      if (!res.ok) {
        setProfileMessage('error');
        setProfileSaving(false);
        return;
      }
      await updateSession();
      setProfileMessage('saved');
    } catch {
      setProfileMessage('error');
    }
    setProfileSaving(false);
  };

  const handleSaveProfile = async () => {
    setProfileMessage(null);
    setProfileSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: displayName.trim() || null }),
      });
      if (!res.ok) {
        setProfileMessage('error');
        setProfileSaving(false);
        return;
      }
      await updateSession();
      setProfileMessage('saved');
    } catch {
      setProfileMessage('error');
    }
    setProfileSaving(false);
  };

  const handleChangePassword = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings.passwordMismatch'));
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPassword, newPassword }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setPasswordError(body.error ?? t('settings.passwordUpdateFailed'));
        setPasswordSaving(false);
        return;
      }
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordError(t('settings.errorGeneric'));
    }
    setPasswordSaving(false);
  };

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <div className="border-border bg-muted/20 rounded-lg border p-4">
        <p className="text-foreground mb-2 text-sm font-medium">{t('settings.profile')}</p>
        <p className="text-muted-foreground mb-3 text-xs">{t('settings.profileDescription')}</p>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div
              className={cn(
                'flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-bold text-white',
                'bg-linear-to-br from-indigo-500 to-violet-600',
              )}
            >
              {user?.image ? (
                <Image
                  src={user.image}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                initials
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="sr-only"
              tabIndex={-1}
              onChange={handleAvatarChange}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              disabled={profileSaving}
              onClick={() => avatarInputRef.current?.click()}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {t('settings.changeAvatar')}
            </button>
            {user?.image && (
              <button
                type="button"
                disabled={profileSaving}
                onClick={handleRemoveAvatar}
                className="text-muted-foreground hover:text-foreground text-left text-sm disabled:opacity-50"
              >
                {t('settings.removeAvatar')}
              </button>
            )}
          </div>
        </div>
        {profileMessage === 'saved' && (
          <output className="mt-2 block text-xs text-green-600 dark:text-green-400">
            {t('settings.profileSaved')}
          </output>
        )}
        {profileMessage === 'error' && (
          <p className="text-destructive mt-2 text-xs" role="alert">
            {t('settings.profileUpdateError')}
          </p>
        )}
      </div>

      <SettingRow label={t('settings.displayName')}>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t('settings.displayNamePlaceholder')}
          className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring w-full min-w-0 rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
        />
      </SettingRow>
      <div className="flex justify-end">
        <button
          type="button"
          disabled={profileSaving}
          onClick={handleSaveProfile}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          {t('settings.saveProfile')}
        </button>
      </div>

      {user?.email && (
        <SettingRow label={t('settings.emailForSignIn')}>
          <span className="text-muted-foreground text-sm">{user.email}</span>
        </SettingRow>
      )}

      <div>
        <p className="text-foreground mb-1 text-sm font-medium">{t('settings.changePassword')}</p>
        <p className="text-muted-foreground mb-3 text-xs">
          {t('settings.changePasswordDescription')}
        </p>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <input
            type="password"
            autoComplete="current-password"
            placeholder={t('settings.currentPassword')}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="border-border bg-background placeholder:text-muted-foreground focus:border-ring focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder={t('settings.newPassword')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="border-border bg-background placeholder:text-muted-foreground focus:border-ring focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder={t('settings.confirmPassword')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="border-border bg-background placeholder:text-muted-foreground focus:border-ring focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
          />
          {passwordError && (
            <p className="text-destructive text-xs" role="alert">
              {passwordError}
            </p>
          )}
          {passwordSuccess && (
            <output className="block text-xs text-green-600 dark:text-green-400">
              {t('settings.passwordUpdated')}
            </output>
          )}
          <button
            type="submit"
            disabled={passwordSaving}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {t('settings.updatePassword')}
          </button>
        </form>
      </div>
    </section>
  );
}
