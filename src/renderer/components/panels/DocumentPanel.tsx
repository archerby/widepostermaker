import { useId } from 'react';
import { useI18n } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';

export function DocumentPanel() {
  const document = useAppStore((state) => state.document);
  const setDocument = useAppStore((state) => state.setDocument);
  const dpiDescId = useId();
  const marginDescId = useId();
  const overlapDescId = useId();
  const { t } = useI18n();
  const orientations: Array<'portrait' | 'landscape'> = ['portrait', 'landscape'];

  return (
    <section className="panel">
      <header>
        <h3>{t('panels.document.title')}</h3>
        <p>{t('panels.document.description')}</p>
      </header>
      <label className="field">
        {t('panels.document.paperSize')}
        <select value={document.paperSize} onChange={(e) => setDocument({ paperSize: e.target.value as 'A4' | 'Letter' })}>
          <option value="A4">A4</option>
          <option value="Letter">Letter</option>
        </select>
      </label>
      <label className="field">
        {t('panels.document.orientation')}
        <div className="segmented">
          {orientations.map((value) => (
            <button
              key={value}
              type="button"
              className={document.orientation === value ? 'segmented__option active' : 'segmented__option'}
              onClick={() => setDocument({ orientation: value as 'portrait' | 'landscape' })}
            >
              {t(`panels.document.orientations.${value}`)}
            </button>
          ))}
        </div>
      </label>
      <label className="field">
        {t('panels.document.dpi')}
        <input
          type="number"
          min={72}
          max={600}
          value={document.dpi}
          onChange={(e) => setDocument({ dpi: Number(e.target.value) })}
          aria-describedby={dpiDescId}
        />
        <span id={dpiDescId} className="sr-only">
          {t('panels.document.dpiDescription', { value: document.dpi })}
        </span>
      </label>
      <label className="field">
        {t('panels.document.margins')}
        <input
          type="number"
          min={0}
          max={30}
          value={document.marginMm}
          onChange={(e) => setDocument({ marginMm: Number(e.target.value) })}
          aria-describedby={marginDescId}
        />
        <span id={marginDescId} className="sr-only">
          {t('panels.document.marginDescription', { value: document.marginMm })}
        </span>
      </label>
      <label className="field">
        {t('panels.document.overlap')}
        <input
          type="number"
          min={0}
          max={20}
          value={document.overlapMm}
          onChange={(e) => setDocument({ overlapMm: Number(e.target.value) })}
          aria-describedby={overlapDescId}
        />
        <span id={overlapDescId} className="sr-only">
          {t('panels.document.overlapDescription', { value: document.overlapMm })}
        </span>
      </label>
      <p className="panel__hint">{t('panels.document.hint')}</p>
    </section>
  );
}
