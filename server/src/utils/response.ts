import type { ServerResponse } from 'node:http';

/** Send a JSON response with the given status code and data. */
export function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/** Send an error response in the standard `{ error: string }` shape. */
export function sendError(res: ServerResponse, status: number, message: string): void {
  sendJson(res, status, { error: message });
}
