import type { IncomingMessage, ServerResponse } from 'node:http';
import * as contactService from '../services/contact.service.js';
import { sendJson, sendError } from '../utils/response.js';
import { parseBody } from '../utils/parseBody.js';
import { handleControllerError } from '../utils/controllerWrapper.js';
import type { ContactMessagePayload } from '../types/contact.js';

const EMAIL_REGEXP = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/contact
 */
export async function handleCreateContactMessage(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await parseBody<ContactMessagePayload>(req);

    if (!body.name || !body.email || !body.subject || !body.message) {
      sendError(res, 400, 'All fields (name, email, subject, message) are required');
      return;
    }

    const name = body.name.trim();
    const subject = body.subject.trim();
    const message = body.message.trim();

    if (name.length === 0 || subject.length === 0 || message.length === 0) {
      sendError(res, 400, 'Fields cannot be blank');
      return;
    }

    if (name.length > 100) {
      sendError(res, 400, 'Name must be under 100 characters');
      return;
    }

    if (subject.length > 200) {
      sendError(res, 400, 'Subject must be under 200 characters');
      return;
    }

    if (message.length > 5000) {
      sendError(res, 400, 'Message must be under 5000 characters');
      return;
    }

    if (!EMAIL_REGEXP.test(body.email)) {
      sendError(res, 400, 'Please provide a valid email address');
      return;
    }

    const result = await contactService.createContactMessage({
      name,
      email: body.email.trim(),
      subject,
      message,
    });

    sendJson(res, 201, {
      message: 'Support message received successfully',
      id: result.id,
    });
  } catch (error) {
    handleControllerError(res, error, 'CreateContactMessage');
  }
}
