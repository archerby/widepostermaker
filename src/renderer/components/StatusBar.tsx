import { useI18n } from '../i18n';
import { useAppStore } from '../store/useAppStore';

export function StatusBar() {
  const grid = useAppStore((state) => state.grid);
  const document = useAppStore((state) => state.document);
  const statusMessage = useAppStore((state) => state.statusMessage);
  const viewState = useAppStore((state) => state.viewState);
  const job = useAppStore((state) => state.job);
  const tiles = useAppStore((state) => state.tiles);
  const { t, formatMeasurement, formatNumber } = useI18n();
  const summary = `${document.paperSize} · ${formatNumber(document.dpi)} DPI · ${grid.rows}×${grid.cols} · ${formatMeasurement(tiles.posterSizeMm.width)} × ${formatMeasurement(tiles.posterSizeMm.height)}`;
  const jobProgress = viewState === 'exporting' && job ? `${Math.round(job.progress * 100)}% · ${job.step}` : null;

  return (
    <footer className="status-bar" aria-live="polite">
      <span>{summary}</span>
      <span>
        {t('status.pages')}: {tiles.pageCount}
      </span>
      <span>{statusMessage}</span>
      {jobProgress && (
        <span>
          {t('status.exportProgress')} {jobProgress}
        </span>
      )}
    </footer>
  );
}
