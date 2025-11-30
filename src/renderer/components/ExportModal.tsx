import { useEffect } from 'react';
import { useI18n } from '../i18n';
import { useAppStore } from '../store/useAppStore';

export function ExportModal() {
  const viewState = useAppStore((state) => state.viewState);
  const job = useAppStore((state) => state.job);
  const cancelExport = useAppStore((state) => state.cancelExport);
  const { t } = useI18n();

  useEffect(() => {
    if (viewState !== 'exporting') {
      return;
    }
    const handleEscape = () => {
      cancelExport();
    };
    window.addEventListener('poster:global-escape', handleEscape);
    return () => window.removeEventListener('poster:global-escape', handleEscape);
  }, [cancelExport, viewState]);

  if (viewState !== 'exporting') {
    return null;
  }

  return (
    <div className="export-modal" role="dialog" aria-modal="true" aria-label={t('exportModal.title')}>
      <div className="export-modal__card">
        <h3>{t('exportModal.title')}</h3>
        <p aria-live="polite" role="status">
          {job.message}
        </p>
        <div className="progress">
          <div className="progress__bar" style={{ width: `${job.progress * 100}%` }} />
        </div>
        <p className="progress__meta" aria-live="polite">
          {t('exportModal.step')}: {job.step} · {Math.round(job.progress * 100)}%
        </p>
        <button className="ghost" onClick={cancelExport}>
          {t('exportModal.cancel')}
        </button>
      </div>
    </div>
  );
}
