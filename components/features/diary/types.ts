// Shared TypeScript definitions for diary components
import type { JSONContent } from '@tiptap/react';

export type DiaryViewMode = 'list' | 'calendar';

export type DiaryMeta = {
  id: string;
  journalId: string;
  entryDate: string;
  createdAt: string;
  updatedAt: string;
  hasContent: boolean;
  previewText?: string;
  previewImage?: string | null;
  weatherTempC?: number | null;
  weatherCode?: number | null;
  weatherLabel?: string | null;
  locationName?: string | null;
  locationShort?: string | null;
  locationLat?: number | null;
  locationLon?: number | null;
};

export type DiaryJournal = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type DiaryTemplate = {
  id: string;
  name: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type DiaryEntryResponse = {
  id?: string;
  entryDate: string;
  content: JSONContent | null;
  createdAt: string | null;
  updatedAt: string | null;
  weather?: {
    tempC?: number | null;
    weatherCode?: number | null;
    weatherLabel?: string | null;
    locationName?: string | null;
    locationShort?: string | null;
    locationLat?: number | null;
    locationLon?: number | null;
  };
  exists: boolean;
};

export type WeatherSummary = {
  tempC: number;
  weatherCode: number;
  weatherLabel: string;
  locationName: string;
  locationShort: string;
  locationLat?: number | null;
  locationLon?: number | null;
};

export type CachedWeatherSummary = WeatherSummary & {
  cachedAt: number;
  date: string;
};


export type DiaryTranslate = (key: string) => string;
