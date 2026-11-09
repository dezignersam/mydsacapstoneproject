import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DomainError } from '../domain/errors.js';
import { MockPaymentGateway } from '../lib/mockPaymentGateway.js';
import MemoryRepository from '../repositories/memory.js';
import BookingService from '../services/bookingService.js';
import EventService from '../services/eventService.js';
import { createRouter } from './router.js';

const DEFAULT_PUBLIC_DIRECTORY = fileURLToPath(new URL('../../public/', import.meta.url));
const MAX_JSON_BYTES = 1024 * 1024;
const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function sendJson(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  });
  response.end(body);
}

function sendError(response, status, code, message) {
  sendJson(response, status, { error: { code, message } });
}

function getHttpStatus(error) {
  const statusByCode = {
    VALIDATION: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INVALID_JSON: 400,
    INVALID_TRANSITION: 409,
    INVALID_STATE: 409,
    SOLD_OUT: 409,
    PAYMENT_DECLINED: 402,
    NOT_SOLD_OUT: 409,
  };

  if (error instanceof HttpError) return error.status;
  if (error instanceof DomainError) return statusByCode[error.code] ?? 400;
  return 500;
}

function errorResponse(response, error) {
  const status = getHttpStatus(error);
  const code = error instanceof HttpError ? error.code : error instanceof DomainError ? error.code : 'INTERNAL_ERROR';
  const message = error instanceof HttpError || error instanceof DomainError ? error.message : 'Internal server error';
  sendError(response, status, code, message);
}

async function readJsonBody(request) {
  if (!request.headers['content-type']?.toLowerCase().includes('application/json')) return undefined;

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_JSON_BYTES) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'JSON body is too large');
    chunks.push(chunk);
  }

  if (size === 0) return undefined;

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'Request body must contain valid JSON');
  }
}

function isWithinDirectory(directory, candidate) {
  const pathFromRoot = relative(directory, candidate);
  return pathFromRoot === '' || (pathFromRoot !== '..' && !pathFromRoot.startsWith(`..${sep}`) && !isAbsolute(pathFromRoot));
}

function getUserId(request) {
  const userId = request.headers['x-user-id'];
  if (typeof userId !== 'string' || userId.trim() === '') {
    throw new DomainError('UNAUTHORIZED', 'x-user-id header is required');
  }
  return userId.trim();
}

function parseSearchCriteria(searchParams) {
  const criteria = {};
  for (const [key, value] of searchParams.entries()) {
    if (key === 'sort') continue;
    if (key === 'maxPriceCents') {
      criteria[key] = Number(value);
      continue;
    }
    if (key === 'onlyAvailable') {
      criteria[key] = value === 'true';
      continue;
    }
    criteria[key] = value;
  }
  return criteria;
}

async function serveStatic(request, response, pathname, publicDirectory) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false;

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    throw new HttpError(400, 'INVALID_PATH', 'Request path is malformed');
  }
  if (decodedPath.includes('\0')) throw new HttpError(400, 'INVALID_PATH', 'Request path is malformed');

  const root = await realpath(publicDirectory);
  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^[/\\]+/, '');
  const candidate = resolve(root, relativePath);
  if (!isWithinDirectory(root, candidate)) {
    sendError(response, 404, 'NOT_FOUND', 'Resource not found');
    return true;
  }

  let filePath;
  try {
    filePath = await realpath(candidate);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      sendError(response, 404, 'NOT_FOUND', 'Resource not found');
      return true;
    }
    throw error;
  }
  if (!isWithinDirectory(root, filePath) || !(await stat(filePath)).isFile()) {
    sendError(response, 404, 'NOT_FOUND', 'Resource not found');
    return true;
  }

  const body = request.method === 'HEAD' ? Buffer.alloc(0) : await readFile(filePath);
  response.writeHead(200, {
    'content-type': CONTENT_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    'content-length': request.method === 'HEAD' ? (await stat(filePath)).size : body.length,
  });
  response.end(body);
  return true;
}

export function createApp({
  publicDirectory = DEFAULT_PUBLIC_DIRECTORY,
  router = createRouter(),
  repository = new MemoryRepository(),
  eventService = new EventService(repository),
  bookingService = new BookingService(repository, new MockPaymentGateway()),
} = {}) {
  router.add('GET', '/health', (_request, response) => {
    sendJson(response, 200, { status: 'ok' });
  });

  router.add('POST', '/api/events', async (request, response, _params, body) => {
    const userId = getUserId(request);
    const payload = body ?? {};
    const event = await eventService.createEvent({ ...payload, organizerId: userId });
    sendJson(response, 201, event);
  });

  router.add('POST', '/api/events/:id/tiers', async (request, response, params, body) => {
    getUserId(request);
    const payload = body ?? {};
    const tier = await eventService.addTier(params.id, payload);
    sendJson(response, 201, tier);
  });

  router.add('POST', '/api/events/:id/publish', async (request, response, params) => {
    getUserId(request);
    const event = await eventService.publishEvent(params.id);
    sendJson(response, 200, event);
  });

  router.add('POST', '/api/events/:id/unpublish', async (request, response, params) => {
    getUserId(request);
    const event = await eventService.unpublishEvent(params.id);
    sendJson(response, 200, event);
  });

  router.add('GET', '/api/events', async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const sortBy = url.searchParams.get('sort') ?? 'date';
    const criteria = parseSearchCriteria(url.searchParams);
    const events = await eventService.listEvents(criteria, sortBy);
    sendJson(response, 200, events);
  });

  router.add('POST', '/api/bookings', async (request, response, _params, body) => {
    const userId = getUserId(request);
    const payload = body ?? {};
    const booking = await bookingService.bookTickets({
      tierId: payload.tierId,
      userId,
      quantity: payload.quantity,
    });
    sendJson(response, 201, booking);
  });

  router.add('POST', '/api/bookings/:reference/pay', async (request, response, params, body) => {
    const userId = getUserId(request);
    const payload = body ?? {};
    const booking = await bookingService.payBooking(params.reference, userId, payload.card ?? {});
    sendJson(response, 200, booking);
  });

  router.add('POST', '/api/bookings/:reference/cancel', async (request, response, params) => {
    const userId = getUserId(request);
    const booking = await bookingService.cancelBooking(params.reference, userId);
    sendJson(response, 200, booking);
  });

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      const body = await readJsonBody(request);
      const match = router.match(request.method, url.pathname);

      if (match) {
        await match.handler(request, response, match.params, body);
        return;
      }

      if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
        sendError(response, 404, 'NOT_FOUND', 'API route not found');
        return;
      }
      if (await serveStatic(request, response, url.pathname, publicDirectory)) return;
      sendError(response, 404, 'NOT_FOUND', 'Resource not found');
    } catch (error) {
      if (!response.headersSent) errorResponse(response, error);
      else response.destroy();
    }
  });
}