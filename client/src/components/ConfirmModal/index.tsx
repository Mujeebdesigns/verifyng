import React, { useEffect, useId, useRef } from 'react';
import { Button } from '../Button/index.js';
import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const messageId = useId();

  // Keep latest values in refs so the keydown listener never goes stale
  const onCancelRef = useRef(onCancel);
  const loadingRef = useRef(loading);
  useEffect(() => {
    onCancelRef.current = onCancel;
    loadingRef.current = loading;
  });

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus the cancel button on open (safe default for a destructive confirm)
    const focusables = modalRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])');
    focusables?.[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loadingRef.current) {
        e.stopPropagation();
        onCancelRef.current();
        return;
      }

      // Trap Tab focus within the modal
      if (e.key === 'Tab' && modalRef.current) {
        const items = modalRef.current.querySelectorAll<HTMLButtonElement>('button:not([disabled])');
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close when the backdrop itself is clicked, not the modal content
    if (e.target === e.currentTarget && !loading) {
      onCancel();
    }
  };

  return (
    <div className={styles.overlay} onMouseDown={handleBackdropMouseDown}>
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
      >
        <div className={styles.header}>
          <h3 id={titleId} className={styles.title}>{title}</h3>
        </div>
        <div className={styles.body}>
          <p id={messageId} className={styles.message}>{message}</p>
        </div>
        <div className={styles.actions}>
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
