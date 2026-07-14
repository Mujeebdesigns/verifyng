import type { IncomingMessage, ServerResponse } from 'node:http';
import { sendError } from './response.js';
import { logger } from './logger.js';

/**
 * Route handler receives the request, response, and extracted path parameters.
 */
export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>,
) => void | Promise<void>;

interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
}

/**
 * Lightweight request router for native Node.js HTTP.
 *
 * Supports named path parameters (`:id` style) and exact method matching.
 * Query strings are stripped before matching so routes only match on pathname.
 */
export function createRouter() {
  const routes: Route[] = [];

  function addRoute(method: string, path: string, handler: RouteHandler) {
    const paramNames: string[] = [];
    const patternStr = path.replace(/:(\w+)/g, (_, name: string) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    routes.push({
      method,
      pattern: new RegExp(`^${patternStr}$`),
      paramNames,
      handler,
    });
    // Sort routes so that static routes (0 parameters) are checked before parameterized routes
    routes.sort((a, b) => a.paramNames.length - b.paramNames.length);
  }

  return {
    get: (path: string, handler: RouteHandler) => addRoute('GET', path, handler),
    post: (path: string, handler: RouteHandler) => addRoute('POST', path, handler),
    put: (path: string, handler: RouteHandler) => addRoute('PUT', path, handler),
    delete: (path: string, handler: RouteHandler) => addRoute('DELETE', path, handler),

    /**
     * Resolve the incoming request against registered routes.
     * Returns true if a route was matched, false otherwise (caller handles 404).
     * Async handlers are awaited to prevent unhandled promise rejections.
     */
    async resolve(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
      const method = req.method ?? 'GET';
      const rawUrl = req.url ?? '/';

      // Strip query string — router matches on pathname only
      const qIdx = rawUrl.indexOf('?');
      const pathname = qIdx === -1 ? rawUrl : rawUrl.slice(0, qIdx);

      for (const route of routes) {
        if (route.method !== method) continue;
        const match = pathname.match(route.pattern);
        if (!match) continue;

        const params: Record<string, string> = {};
        try {
          route.paramNames.forEach((name, i) => {
            params[name] = decodeURIComponent(match[i + 1]);
          });
        } catch {
          sendError(res, 400, 'Malformed URL parameter encoding');
          return true;
        }

        try {
          await route.handler(req, res, params);
        } catch (error) {
          logger.error('Unhandled route error', error);
          sendError(res, 500, 'Internal server error');
        }
        return true;
      }

      return false;
    },
  };
}
