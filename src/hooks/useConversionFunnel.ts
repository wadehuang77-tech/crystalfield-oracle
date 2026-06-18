import { useState, useEffect } from 'react';

interface ConversionFunnelConfig {
  modalDelay?: number;
  reminderDelay?: number;
  enabled?: boolean;
}

export function useConversionFunnel(
  readingCompleted: boolean,
  config: ConversionFunnelConfig = {}
) {
  const {
    modalDelay = 1500,
    reminderDelay = 10000,
    enabled = true,
  } = config;

  const [showModal, setShowModal] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [modalDismissed, setModalDismissed] = useState(false);

  useEffect(() => {
    if (!enabled || !readingCompleted) return;

    if (window.gtag) {
      window.gtag('event', 'tarot_reading_completed', {
        event_category: 'engagement',
        event_label: 'reading_done',
      });
    }

    const modalTimer = setTimeout(() => {
      setShowModal(true);
    }, modalDelay);

    return () => clearTimeout(modalTimer);
  }, [readingCompleted, modalDelay, enabled]);

  useEffect(() => {
    if (!enabled || !modalDismissed) return;

    const reminderTimer = setTimeout(() => {
      setShowReminder(true);
    }, reminderDelay);

    return () => clearTimeout(reminderTimer);
  }, [modalDismissed, reminderDelay, enabled]);

  const handleModalClose = () => {
    setShowModal(false);
    setModalDismissed(true);
  };

  const handleReminderClose = () => {
    setShowReminder(false);
  };

  return {
    showModal,
    showReminder,
    handleModalClose,
    handleReminderClose,
  };
}
