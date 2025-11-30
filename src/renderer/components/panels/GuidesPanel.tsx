import { useId } from 'react';
import { useI18n } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';

export function GuidesPanel() {
  const guides = useAppStore((state) => state.guides);
  const setGuides = useAppStore((state) => state.setGuides);
  const bleedDescId = useId();
  const { t } = useI18n();

  return (
    <section className="panel">
      <header>
        <h3>{t('panels.guides.title')}</h3>
        <p>{t('panels.guides.description')}</p>
      </header>
      <label className="field field--toggle">
        <span>{t('panels.guides.showInPreview')}</span>
        <input type="checkbox" checked={guides.showGuidesInPreview} onChange={(e) => setGuides({ showGuidesInPreview: e.target.checked })} />
      </label>
      <label className="field field--toggle">
        <span>{t('panels.guides.cropMarks')}</span>
        <input type="checkbox" checked={guides.cropMarks} onChange={(e) => setGuides({ cropMarks: e.target.checked })} />
      </label>
      <label className="field field--toggle">
        <span>{t('panels.guides.tileLabels')}</span>
        <input type="checkbox" checked={guides.tileLabels} onChange={(e) => setGuides({ tileLabels: e.target.checked })} />
      </label>
      <label className="field">
        {t('panels.guides.bleed')}
        <input
          type="number"
          min={0}
          max={10}
          value={guides.bleedMm}
          onChange={(e) => setGuides({ bleedMm: Number(e.target.value) })}
          aria-describedby={bleedDescId}
        />
        <span id={bleedDescId} className="sr-only">
          {t('panels.guides.bleedDescription', { value: guides.bleedMm })}
        </span>
      </label>
    </section>
  );
}
