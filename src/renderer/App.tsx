import { useCallback, useEffect } from 'react';
import { PreviewWorkspace } from './components/PreviewWorkspace';
import { StatusBar } from './components/StatusBar';
import { TopToolbar } from './components/TopToolbar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ExportModal } from './components/ExportModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const viewState = useAppStore((state) => state.viewState);
  const loadImage = useAppStore((state) => state.loadImage);
  const textScale = useAppStore((state) => state.preferences.textScale);
  const highContrast = useAppStore((state) => state.preferences.highContrast);

  const handleOpenImage = useCallback(async () => {
    const result = await window.posterAPI?.openImageDialog();
    if (result) {
      await loadImage(result);
    }
  }, [loadImage]);

  useKeyboardShortcuts({ onOpenImage: handleOpenImage });

  useEffect(() => {
    document.documentElement.style.setProperty('--app-text-scale', String(textScale));
    document.documentElement.dataset.highContrast = highContrast ? 'on' : 'off';
  }, [highContrast, textScale]);

  useEffect(() => {
    if (!window.posterAPI?.onMenuOpenImage) {
      return () => undefined;
    }
    const unsubscribe = window.posterAPI.onMenuOpenImage(() => {
      handleOpenImage();
    });
    return unsubscribe;
  }, [handleOpenImage]);

  return (
    <div className="app-shell">
      <TopToolbar onOpenImage={handleOpenImage} />
      <div className="app-main">
        <main className="app-content">
          {viewState === 'empty' && <WelcomeScreen onOpenImage={handleOpenImage} />}
          {viewState !== 'empty' && <PreviewWorkspace />}
        </main>
      </div>
      <StatusBar />
      <ExportModal />
    </div>
  );
}
