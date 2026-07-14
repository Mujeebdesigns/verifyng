import { prisma } from '../utils/prisma.js';
import { sendAdminNotification } from '../utils/email.js';
import { logger } from '../utils/logger.js';
import type { ContactMessagePayload } from '../types/contact.js';

/**
 * Handle new support form message submission.
 * Saves the message to the database and sends an email notification if SMTP is configured.
 */
export async function createContactMessage(payload: ContactMessagePayload) {
  // 1. Save contact message to database
  const message = await prisma.contactMessage.create({
    data: {
      name: payload.name,
      email: payload.email,
      subject: payload.subject,
      message: payload.message,
      status: 'PENDING',
    },
  });

  // 2. Email administrator if SMTP config is present (graceful degradation)
  try {
    await sendAdminNotification(payload);
    logger.info('Contact email alert sent successfully');
  } catch (error) {
    logger.error('Failed to send contact notification email', error);
  }

  return message;
}
