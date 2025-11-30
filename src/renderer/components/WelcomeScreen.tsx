import { useCallback, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { useI18n } from '../i18n';
import { useAppStore } from '../store/useAppStore';

interface Props {
  onOpenImage: () => void;
}

export function WelcomeScreen({ onOpenImage }: Props) {
  const { t } = useI18n();
  const loadImage = useAppStore((state) => state.loadImage);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const hasFiles = useCallback((event: DragEvent) => {
    const types = Array.from(event.dataTransfer?.types ?? []);
    return types.includes('Files');
  }, []);

  const resetDragState = useCallback(() => {
    dragCounter.current = 0;
    setIsDragging(false);
  }, []);

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!hasFiles(event)) {
        return;
      }
      event.preventDefault();
      dragCounter.current += 1;
      setIsDragging(true);
    },
    [hasFiles]
  );

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!hasFiles(event)) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    },
    [hasFiles]
  );

  const handleDragLeave = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!hasFiles(event)) {
        return;
      }
      event.preventDefault();
      dragCounter.current = Math.max(0, dragCounter.current - 1);
      if (dragCounter.current === 0) {
        setIsDragging(false);
      }
    },
    [hasFiles]
  );

  const handleDrop = useCallback(
    async (event: DragEvent<HTMLElement>) => {
      if (!hasFiles(event)) {
        return;
      }
      event.preventDefault();
      const files = Array.from(event.dataTransfer?.files ?? []);
      resetDragState();
      const firstWithPath = files.find((file) => 'path' in file && typeof (file as File & { path?: string }).path === 'string');
      const filePath = firstWithPath ? (firstWithPath as File & { path?: string }).path : undefined;
      if (filePath) {
        await loadImage(filePath);
      }
    },
    [hasFiles, loadImage, resetDragState]
  );

  const welcomeClassName = isDragging ? 'welcome welcome--dragging' : 'welcome';

  return (
    <section
      className={welcomeClassName}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-label={t('welcome.dropAriaLabel')}
    >
      <div className="hero">
        <h1>{t('welcome.title')}</h1>
        <p>{t('welcome.description')}</p>
        <div className="cta-row">
          <button className="primary" onClick={onOpenImage}>
            {t('welcome.primaryCta')}
          </button>
          <button className="ghost" disabled>
            {t('welcome.secondaryCta')}
          </button>
        </div>
        <p className="drop-hint">{t('welcome.dropHint')}</p>
      </div>
    </section>
  );
}
