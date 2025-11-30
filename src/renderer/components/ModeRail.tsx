import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useI18n } from '../i18n';
import { Mode, useAppStore } from '../store/useAppStore';

const orderedModes: Mode[] = ['preview', 'settings', 'export', 'learn'];
type FocusEventListener = (event: Event) => void;

export function ModeRail() {
  const mode = useAppStore((state) => state.mode);
  const setMode = useAppStore((state) => state.setMode);
  const { t } = useI18n();
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const handleFocusRequest = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      const index = customEvent.detail;
      const button = buttonsRef.current[index];
      button?.focus();
    };
    const listener = handleFocusRequest as FocusEventListener;
    window.addEventListener('poster:focus-mode', listener);
    return () => window.removeEventListener('poster:focus-mode', listener);
  }, []);

  const focusByOffset = (currentIndex: number, delta: number) => {
    const nextIndex = (currentIndex + delta + orderedModes.length) % orderedModes.length;
    buttonsRef.current[nextIndex]?.focus();
    setMode(orderedModes[nextIndex]);
  };

  const focusByIndex = (index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, orderedModes.length - 1));
    buttonsRef.current[clampedIndex]?.focus();
    setMode(orderedModes[clampedIndex]);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        focusByOffset(index, 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        focusByOffset(index, -1);
        break;
      case 'Home':
        event.preventDefault();
        focusByIndex(0);
        break;
      case 'End':
        event.preventDefault();
        focusByIndex(orderedModes.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <nav className="mode-rail" aria-label={t('navigation.modes')}>
      {orderedModes.map((item, index) => (
        <button
          key={item}
          className={item === mode ? 'mode-rail__btn active' : 'mode-rail__btn'}
          onClick={() => setMode(item)}
          aria-current={item === mode ? 'true' : undefined}
          ref={(el) => {
            buttonsRef.current[index] = el;
          }}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >
          {t(`modes.${item}`)}
        </button>
      ))}
    </nav>
  );
}
