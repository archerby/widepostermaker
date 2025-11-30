import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const shouldSkipTarget = (target: EventTarget | null) => {
  if (!target || typeof target !== 'object') {
    return false;
  }
  const element = target as HTMLElement;
  const tag = element.tagName;
  return element.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

const focusModeButton = (index: number) => {
  window.dispatchEvent(new CustomEvent('poster:focus-mode', { detail: index }));
};

interface Options {
  onOpenImage: () => void;
}

export function useKeyboardShortcuts({ onOpenImage }: Options) {
  const startExport = useAppStore((state) => state.startExport);
  const undo = useAppStore((state) => state.undo);
  const redo = useAppStore((state) => state.redo);
  const setPreferences = useAppStore((state) => state.setPreferences);
  const setMode = useAppStore((state) => state.setMode);
  const textScale = useAppStore((state) => state.preferences.textScale);

  useEffect(() => {
    const handler = async (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
      const { shiftKey, altKey } = event;
      const key = event.key.toLowerCase();

      if (ctrlOrCmd && shouldSkipTarget(target)) {
        return;
      }

      if (ctrlOrCmd) {
        if (key === 'o') {
          event.preventDefault();
          onOpenImage();
          return;
        }
        if (key === 'p') {
          event.preventDefault();
          await startExport();
          return;
        }
        if (key === 'z' && !shiftKey) {
          event.preventDefault();
          undo();
          return;
        }
        if ((key === 'z' && shiftKey) || key === 'y') {
          event.preventDefault();
          redo();
          return;
        }
        if (key === '=' || key === '+') {
          event.preventDefault();
          setPreferences({ textScale: clamp(textScale + 0.05, 0.9, 1.2) });
          return;
        }
        if (key === '-') {
          event.preventDefault();
          setPreferences({ textScale: clamp(textScale - 0.05, 0.9, 1.2) });
          return;
        }
        if (key === '0') {
          event.preventDefault();
          setPreferences({ textScale: 1 });
          return;
        }
      }

      if (altKey && !ctrlOrCmd && !shiftKey) {
        if (shouldSkipTarget(target)) {
          return;
        }
        if (key >= '1' && key <= '4') {
          event.preventDefault();
          const index = Number(key) - 1;
          const modes: Array<'preview' | 'settings' | 'export' | 'learn'> = ['preview', 'settings', 'export', 'learn'];
          const mode = modes[index];
          if (mode) {
            setMode(mode);
            focusModeButton(index);
          }
        }
        return;
      }

      if (shouldSkipTarget(target)) {
        return;
      }

      if (event.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('poster:global-escape'));
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpenImage, redo, setMode, setPreferences, startExport, textScale, undo]);
}
