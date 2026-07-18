import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './RowActionMenu.module.css';

export interface RowAction {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface RowActionMenuProps {
  actions: RowAction[];
  label?: string;
}

/**
 * A calm kebab (⋮) menu for table row actions. Opens a small dropdown so the
 * row stays clean and level instead of being crowded by inline buttons.
 *
 * The menu is fixed-positioned from the trigger's rect so it escapes the
 * table's `overflow-x: auto` clipping. It closes on outside click, Escape,
 * scroll, or resize.
 */
export const RowActionMenu: React.FC<RowActionMenuProps> = ({ actions, label = 'Row actions' }) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const MENU_WIDTH = 176; // keep in sync with .menu min-width (11rem)
      const left = Math.max(8, r.right - MENU_WIDTH);
      setCoords({ top: r.bottom + 6, left });
    }
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    // Capture-phase scroll so scrolling any ancestor (e.g. the table) closes it.
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={styles.kebab}
        onClick={toggle}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>

      {open && coords && (
        <div
          ref={menuRef}
          className={styles.menu}
          role="menu"
          style={{ top: coords.top, left: coords.left }}
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              className={action.danger ? styles.itemDanger : styles.item}
              onClick={() => {
                action.onClick();
                close();
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
};

export default RowActionMenu;
