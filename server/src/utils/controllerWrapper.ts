import type { ServerResponse } from 'node:http';
import { sendError } from './response.js';
import { AppError } from './AppError.js';
import { parseQuery } from './parseQuery.js';
import { logger } from './logger.js';

export function handleControllerError(res: ServerResponse, error: unknown, logLabel: string): void {
  if (error instanceof AppError) {
    sendError(res, error.statusCode, error.message);
  } else {
    logger.error(`${logLabel} error`, error);
    sendError(res, 500, 'Internal server error');
  }
}

export function parsePagination(reqUrl: string, defaultLimit = 10, maxPage = 100) {
  const queryParams = parseQuery(reqUrl);
  const page = parseInt(queryParams.page ?? '1', 10);
  const limit = parseInt(queryParams.limit ?? String(defaultLimit), 10);
  return {
    page: isNaN(page) || page < 1 ? 1 : Math.min(page, maxPage),
    limit: isNaN(limit) || limit < 1 || limit > 100 ? defaultLimit : limit,
  };
}
