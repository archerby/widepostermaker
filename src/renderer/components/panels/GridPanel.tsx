import { useId } from 'react';
import { useI18n } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';

export function GridPanel() {
  const grid = useAppStore((state) => state.grid);
  const setGrid = useAppStore((state) => state.setGrid);
  const rowsDescId = useId();
  const colsDescId = useId();
  const { t } = useI18n();

  return (
    <section className="panel">
      <header>
        <h3>{t('panels.grid.title')}</h3>
        <p>{t('panels.grid.description')}</p>
      </header>
      <label className="field field--toggle">
        <span>{t('panels.grid.autoFit')}</span>
        <input type="checkbox" checked={grid.autoFit} onChange={(e) => setGrid({ autoFit: e.target.checked })} />
      </label>
      <label className="field field--toggle">
        <span>{t('panels.grid.lockAspect')}</span>
        <input type="checkbox" checked={grid.lockAspect} onChange={(e) => setGrid({ lockAspect: e.target.checked })} />
      </label>
      <label className="field">
        {t('panels.grid.rowsLabel')}
        <input
          type="number"
          min={1}
          max={20}
          value={grid.rows}
          disabled={grid.autoFit}
          onChange={(e) => setGrid({ rows: Number(e.target.value) })}
          aria-describedby={rowsDescId}
        />
        <span id={rowsDescId} className="sr-only">
          {t('panels.grid.rowCount', { count: grid.rows })}
        </span>
      </label>
      <label className="field">
        {t('panels.grid.columnsLabel')}
        <input
          type="number"
          min={1}
          max={20}
          value={grid.cols}
          disabled={grid.autoFit}
          onChange={(e) => setGrid({ cols: Number(e.target.value) })}
          aria-describedby={colsDescId}
        />
        <span id={colsDescId} className="sr-only">
          {t('panels.grid.columnCount', { count: grid.cols })}
        </span>
      </label>
      <div className="mini-grid" aria-hidden="true">
        {Array.from({ length: grid.rows * grid.cols }).map((_, idx) => (
          <span key={idx} />
        ))}
      </div>
    </section>
  );
}
