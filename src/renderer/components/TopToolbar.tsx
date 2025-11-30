import { useI18n } from '../i18n';
import { useAppStore } from '../store/useAppStore';
import { LanguageSwitcher } from './LanguageSwitcher';

interface Props {
  onOpenImage: () => void;
}

export function TopToolbar({ onOpenImage }: Props) {
  const viewState = useAppStore((state) => state.viewState);
  const startExport = useAppStore((state) => state.startExport);
  const { t } = useI18n();

  return (
    <header className="toolbar">
      <div className="toolbar__left">
        <span className="logo" aria-label={t('toolbar.logo')}>
          {t('toolbar.logo')}
        </span>
        <button onClick={onOpenImage}>{t('toolbar.openImage')}</button>
      </div>
      <div className="toolbar__right">
        <LanguageSwitcher />
        <button className="primary" disabled={viewState === 'exporting'} onClick={startExport}>
          {t('toolbar.export')}
        </button>
      </div>
    </header>
  );
}
