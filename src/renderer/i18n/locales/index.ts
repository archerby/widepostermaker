import enUS, { type Messages } from './en-US';
import beBY from './be-BY';
import ukUA from './uk-UA';
import plPL from './pl-PL';
import esES from './es-ES';
import ptBR from './pt-BR';

export const FALLBACK_LOCALE = 'en-US';

export const languageOptions = [
  { locale: 'en-US', label: 'EN', name: 'English' },
  { locale: 'be-BY', label: 'BY', name: 'Беларуская' },
  { locale: 'uk-UA', label: 'UA', name: 'Українська' },
  { locale: 'pl-PL', label: 'PL', name: 'Polski' },
  { locale: 'es-ES', label: 'ES', name: 'Español' },
  { locale: 'pt-BR', label: 'PT', name: 'Português' }
] as const;

export const messagesByLocale: Record<string, Messages> = {
  'en-US': enUS,
  en: enUS,
  'be-BY': beBY,
  be: beBY,
  'uk-UA': ukUA,
  uk: ukUA,
  'pl-PL': plPL,
  pl: plPL,
  'es-ES': esES,
  es: esES,
  'pt-BR': ptBR,
  pt: ptBR
};

const aliasMap = Object.fromEntries(
  Object.keys(messagesByLocale).map((localeKey) => [localeKey.toLowerCase(), localeKey])
);

export const normalizeLocale = (input?: string) => {
  if (!input) {
    return FALLBACK_LOCALE;
  }
  const normalizedKey = aliasMap[input.toLowerCase()];
  if (normalizedKey) {
    return normalizedKey;
  }
  const short = input.slice(0, 2).toLowerCase();
  const match = languageOptions.find((option) => option.locale.slice(0, 2).toLowerCase() === short);
  return match?.locale ?? FALLBACK_LOCALE;
};

export type { Messages };
