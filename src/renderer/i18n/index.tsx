import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAppStore } from '../store/useAppStore';
import { FALLBACK_LOCALE, messagesByLocale, normalizeLocale, type Messages } from './locales';
const MM_PER_INCH = 25.4;

type TranslationValues = Record<string, string | number>;

type UnitSystem = 'metric' | 'imperial';

interface I18nContextValue {
  locale: string;
  unitSystem: UnitSystem;
  t: (key: string, values?: TranslationValues) => string;
  setLocale: (locale: string) => void;
  setUnitSystem: (unitSystem: UnitSystem) => void;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatMeasurement: (valueMm: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (timestamp: number | string | Date, options?: Intl.DateTimeFormatOptions) => string;
}

const defaultContext: I18nContextValue = {
  locale: FALLBACK_LOCALE,
  unitSystem: 'metric',
  t: (key) => key,
  setLocale: () => undefined,
  setUnitSystem: () => undefined,
  formatNumber: (value, options) => new Intl.NumberFormat(FALLBACK_LOCALE, options).format(value),
  formatMeasurement: (valueMm, _options) => `${valueMm} mm`,
  formatDate: (timestamp, options) => new Intl.DateTimeFormat(FALLBACK_LOCALE, options).format(new Date(timestamp))
};

const I18nContext = createContext<I18nContextValue>(defaultContext);

const getMessage = (locale: string): Messages => messagesByLocale[locale] ?? messagesByLocale[FALLBACK_LOCALE];

const resolveKey = (messages: Messages, key: string): string | undefined => {
  const segments = key.split('.');
  let current: unknown = messages;
  for (const segment of segments) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    const next = (current as Record<string, unknown>)[segment];
    current = next;
  }
  return typeof current === 'string' ? current : undefined;
};

const applyValues = (template: string, values?: TranslationValues) => {
  if (!values) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, token) => {
    const value = values[token];
    return value === undefined ? match : String(value);
  });
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const rawLocale = useAppStore((state) => state.preferences.locale) || FALLBACK_LOCALE;
  const locale = normalizeLocale(rawLocale);
  const unitSystem = useAppStore((state) => state.preferences.unitSystem);
  const setPreferences = useAppStore((state) => state.setPreferences);

  const value = useMemo<I18nContextValue>(() => {
    const messages = getMessage(locale);
    const numberFormatter = (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(locale, options).format(value);

    const formatMeasurement = (valueMm: number, options?: Intl.NumberFormatOptions) => {
      const useImperial = unitSystem === 'imperial';
      const rawValue = useImperial ? valueMm / MM_PER_INCH : valueMm;
      const formatted = numberFormatter(rawValue, {
        maximumFractionDigits: useImperial ? 2 : 0,
        minimumFractionDigits: 0,
        ...options
      });
      const unit = useImperial ? messages.units.inches : messages.units.millimeters;
      return `${formatted} ${unit}`;
    };

    const formatDate = (timestamp: number | string | Date, options?: Intl.DateTimeFormatOptions) => {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', ...options }).format(date);
    };

    const t = (key: string, values?: TranslationValues) => {
      const template = resolveKey(messages, key);
      if (!template) {
        return key;
      }
      return applyValues(template, values);
    };

    return {
      locale,
      unitSystem,
      t,
      setLocale: (next) => setPreferences({ locale: normalizeLocale(next) }),
      setUnitSystem: (next) => setPreferences({ unitSystem: next }),
      formatNumber: numberFormatter,
      formatMeasurement,
      formatDate
    };
  }, [locale, unitSystem, setPreferences]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
