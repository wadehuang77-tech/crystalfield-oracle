import { useState, useEffect } from 'react';

const STORAGE_KEY = 'tarotCTA_seen';
const MODAL_DELAY_MS = 1500;
const REMINDER_DELAY_MS = 10000;

export function useCrystalPromo(readingComplete: boolean) {
  const [showModal, setShowModal] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [modalDismissed, setModalDismissed] = useState(false);

  useEffect(() => {
    if (!readingComplete) return;

    if (window.gtag) {
      window.gtag('event', 'tarot_reading_completed', {
        event_category: 'engagement',
        event_label: 'reading_done',
      });
    }

    const hasShownBefore = localStorage.getItem(STORAGE_KEY);
    if (hasShownBefore) return;

    const timer = setTimeout(() => {
      setShowModal(true);
    }, MODAL_DELAY_MS);

    return () => clearTimeout(timer);
  }, [readingComplete]);

  useEffect(() => {
    if (!modalDismissed) return;

    const hasShownBefore = localStorage.getItem(STORAGE_KEY);
    if (hasShownBefore) return;

    const reminderTimer = setTimeout(() => {
      setShowReminder(true);
    }, REMINDER_DELAY_MS);

    return () => clearTimeout(reminderTimer);
  }, [modalDismissed]);

  const handleClose = () => {
    setShowModal(false);
    setModalDismissed(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const handleReminderClose = () => {
    setShowReminder(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  return {
    showModal,
    showReminder,
    handleClose,
    handleReminderClose
  };
}
