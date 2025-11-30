import { useI18n } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';

export function OutputPanel() {
  const exportSettings = useAppStore((state) => state.export);
  const setExport = useAppStore((state) => state.setExport);
  const startExport = useAppStore((state) => state.startExport);
  const viewState = useAppStore((state) => state.viewState);
  const { t } = useI18n();

  return (
    <section className="panel">
      <header>
        <h3>{t('panels.output.title')}</h3>
        <p>{t('panels.output.description')}</p>
      </header>
      <div className="panel-callout panel-callout--mono">
        <div>
          <p className="panel-callout__eyebrow">{t('panels.output.toneEyebrow')}</p>
          <h4>{t('panels.output.toneTitle')}</h4>
          <p className="panel-callout__copy">{t('panels.output.toneCopy')}</p>
        </div>
        <label className="panel-callout__toggle">
          <input
            type="checkbox"
            checked={exportSettings.monochrome}
            onChange={(e) => setExport({ monochrome: e.target.checked })}
          />
          <span>{t(exportSettings.monochrome ? 'panels.output.toneEnabled' : 'panels.output.toneDisabled')}</span>
        </label>
      </div>
      <label className="field">
        {t('panels.output.format')}
        <select value={exportSettings.format} onChange={(e) => setExport({ format: e.target.value as 'pdf' | 'png' | 'jpg' })}>
          <option value="pdf">{t('panels.output.formats.pdf')}</option>
          <option value="png">{t('panels.output.formats.png')}</option>
          <option value="jpg">{t('panels.output.formats.jpg')}</option>
        </select>
      </label>
      <label className="field">
        {t('panels.output.destination')}
        <input
          type="text"
          placeholder={t('panels.output.destinationPlaceholder')}
          value={exportSettings.destination}
          onChange={(e) => setExport({ destination: e.target.value })}
        />
      </label>
      <label className="field">
        {t('panels.output.namingPattern')}
        <input type="text" value={exportSettings.namingTemplate} onChange={(e) => setExport({ namingTemplate: e.target.value })} />
      </label>
      <label className="field field--toggle">
        <span>{t('panels.output.openAfterExport')}</span>
        <input type="checkbox" checked={exportSettings.openAfterExport} onChange={(e) => setExport({ openAfterExport: e.target.checked })} />
      </label>
      <label className="field field--toggle">
        <span>{t('panels.output.sendToPrinter')}</span>
        <input type="checkbox" checked={exportSettings.sendToPrinter} onChange={(e) => setExport({ sendToPrinter: e.target.checked })} />
      </label>
      <button className="primary" onClick={startExport} disabled={viewState === 'exporting'}>
        {t('panels.output.startExport')}
      </button>
    </section>
  );
}
