import React, { useState, useRef, useEffect } from 'react';
import styles from './CustomSelect.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  /** Compact sizing for tight controls (e.g. the pagination page-size picker). */
  compact?: boolean;
  /** Open the options above the trigger (e.g. a control near the page bottom). */
  openUp?: boolean;
  /** Extra class on the wrapper so the parent can control width/layout. */
  wrapperClassName?: string;
}

/**
 * A calm custom dropdown that replaces the native <select> — whose OS-rendered
 * options popup ignores styling and clashes with the app's design. Closes on
 * outside click and Escape. Shared by the buyer filters and the pagination
 * page-size picker so the two don't drift.
 */
export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  compact = false,
  openUp = false,
  wrapperClassName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className={`${styles.wrapper} ${wrapperClassName ?? ''}`} ref={ref}>
      <button
        type="button"
        className={`${styles.trigger} ${compact ? styles.triggerCompact : ''}`}
        onClick={() => setIsOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <svg className={styles.arrow} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <div className={`${styles.options} ${openUp ? styles.optionsUp : ''}`} role="listbox">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={o.value === value ? styles.optionActive : styles.option}
              onClick={() => {
                onChange(o.value);
                setIsOpen(false);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
