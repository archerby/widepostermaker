import { useI18n } from '../i18n';
import { languageOptions, normalizeLocale } from '../i18n/locales';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const activeLocale = normalizeLocale(locale);

  return (
    <div className="language-switcher" role="group" aria-label={t('navigation.language')}>
      {languageOptions.map((option) => (
        <button
          key={option.locale}
          type="button"
          className={option.locale === activeLocale ? 'language-switcher__btn is-active' : 'language-switcher__btn'}
          onClick={() => setLocale(option.locale)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
