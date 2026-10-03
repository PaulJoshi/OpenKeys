import type { InputSource } from '../../core/types';
import { useApp } from '../store';
import { runtime } from '../runtime';
import { Icon } from './Icon';

const SOURCES: { id: InputSource; label: string; icon: 'keyboard' | 'piano' | 'mic' }[] = [
  { id: 'virtual', label: 'Computer keys', icon: 'keyboard' },
  { id: 'midi', label: 'MIDI keyboard', icon: 'piano' },
  { id: 'mic', label: 'Microphone', icon: 'mic' },
];

/** Compact input picker beside the input meter: computer keys, MIDI keyboard or microphone. */
export function SourceSwitch({ disabled = false }: { disabled?: boolean }) {
  const source = useApp((s) => s.settings.inputSource);
  return (
    <div className="source-switch" role="radiogroup" aria-label="Input">
      {SOURCES.map((s) => (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={source === s.id}
          aria-label={s.label}
          title={disabled ? `${s.label} (stop first to switch)` : s.label}
          disabled={disabled}
          onClick={() => source !== s.id && runtime.setSource(s.id)}
        >
          <Icon name={s.icon} size={16} />
        </button>
      ))}
    </div>
  );
}
