import type { IncomingMessage, ServerResponse } from 'node:http';
import * as reviewService from '../services/review.service.js';
import { parseBody } from '../utils/parseBody.js';
import { parseQuery } from '../utils/parseQuery.js';
import { sendJson, sendError } from '../utils/response.js';
import { handleControllerError, parsePagination } from '../utils/controllerWrapper.js';
import { validateRating, validateReviewText } from '../utils/validation.js';
import { requireTurnstile } from '../utils/turnstile.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import type { CreateReviewPayload, UpdateReviewPayload, CreateReportPayload } from '../types/review.js';

export async function handleGetMyReviews(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { search, rating, channel, sortBy } = parseQuery(req.url ?? '');
    const { page, limit } = parsePagination(req.url ?? '', 10);

    const result = await reviewService.getMyReviews(authReq.userId, page, limit, {
      search,
      rating,
      channel,
      sortBy,
    });
    sendJson(res, 200, {
      data: result.reviews,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    handleControllerError(res, error, 'GetMyReviews');
  }
}

export async function handleCreateReview(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const body = await parseBody<CreateReviewPayload>(req);

    if (!(await requireTurnstile(req, res, body.turnstileToken))) return;

    if (body.rating === undefined || !body.reviewText) {
      sendError(res, 400, 'Rating and review text are required');
      return;
    }

    const rating = validateRating(body.rating, res);
    if (rating === null) return;

    const reviewText = validateReviewText(body.reviewText, res);
    if (reviewText === null) return;

    if (!body.transactionChannel || !body.transactionChannel.trim()) {
      sendError(res, 400, 'Transaction channel is required');
      return;
    }

    if (!body.orderDate || !body.orderDate.trim()) {
      sendError(res, 400, 'Order date is required');
      return;
    }

    if (body.bankAccountLast4) {
      const bankAcc = body.bankAccountLast4.trim();
      if (!/^\d{4}$/.test(bankAcc)) {
        sendError(res, 400, 'Bank account number must be exactly the last 4 digits for security');
        return;
      }
    }

    if (
      !body.vendorId &&
      !body.businessName &&
      !body.instagramHandle &&
      !body.phoneNumber &&
      !body.bankAccountLast4
    ) {
      sendError(
        res,
        400,
        'Vendor ID or at least one vendor identifier (businessName, instagramHandle, phoneNumber, bankAccountLast4) is required'
      );
      return;
    }

    if (body.transactionChannel && body.transactionChannel.trim().length > 100) {
      sendError(res, 400, 'Transaction channel must be under 100 characters');
      return;
    }

    if (body.orderDate) {
      const parsedDate = Date.parse(body.orderDate);
      if (isNaN(parsedDate)) {
        sendError(res, 400, 'Invalid order date format');
        return;
      }
    }

    const result = await reviewService.createReview(authReq.userId, {
      ...body,
      rating,
      reviewText,
    });

    sendJson(res, 201, result);
  } catch (error) {
    handleControllerError(res, error, 'CreateReview');
  }
}

export async function handleUpdateReview(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id: reviewId } = params;

    if (!reviewId) {
      sendError(res, 400, 'Review ID is required');
      return;
    }

    const body = await parseBody<UpdateReviewPayload>(req);

    if (body.rating === undefined && body.reviewText === undefined) {
      sendError(res, 400, 'At least one field (rating or reviewText) must be provided');
      return;
    }

    const payload: UpdateReviewPayload = {};

    if (body.rating !== undefined) {
      const rating = validateRating(body.rating, res);
      if (rating === null) return;
      payload.rating = rating;
    }

    if (body.reviewText !== undefined) {
      const reviewText = validateReviewText(body.reviewText, res);
      if (reviewText === null) return;
      payload.reviewText = reviewText;
    }

    const result = await reviewService.updateReview(reviewId, authReq.userId, payload);
    sendJson(res, 200, result);
  } catch (error) {
    handleControllerError(res, error, 'UpdateReview');
  }
}

export async function handleDeleteReview(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id: reviewId } = params;

    if (!reviewId) {
      sendError(res, 400, 'Review ID is required');
      return;
    }

    const result = await reviewService.deleteReview(reviewId, authReq.userId);
    sendJson(res, 200, result);
  } catch (error) {
    handleControllerError(res, error, 'DeleteReview');
  }
}

export async function handleReportVendor(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id: vendorId } = params;

    if (!vendorId) {
      sendError(res, 400, 'Vendor ID is required');
      return;
    }

    const body = await parseBody<CreateReportPayload>(req);

    if (!body.reason || body.reason.trim().length < 5) {
      sendError(res, 400, 'Reason must be at least 5 characters');
      return;
    }

    const result = await reviewService.reportVendor(vendorId, authReq.userId, {
      reason: body.reason.trim(),
      description: body.description?.trim(),
    });

    sendJson(res, 201, result);
  } catch (error) {
    handleControllerError(res, error, 'ReportVendor');
  }
}
