import { InventoryError } from './errors.js';

const parsePositiveInt = (value, fallback, name) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new InventoryError(400, `${name} must be a positive integer`);
  }
  return parsed;
};

const parseDate = (value, name, endOfDay = false) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new InventoryError(400, `${name} is not a valid date`);
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
};

const parseType = (value) => {
  if (!value) return undefined;
  const normalized = String(value).toUpperCase();
  const allowed = new Set(['IN', 'OUT', 'ADJUST', 'MOVE']);
  if (!allowed.has(normalized)) {
    throw new InventoryError(400, 'Invalid transaction type');
  }
  return normalized;
};

export const buildTransactionWhere = (query) => {
  const where = {};

  const type = parseType(query.type);
  if (type) where.type = type;

  if (query.productId !== undefined && query.productId !== null && query.productId !== '') {
    where.productId = parsePositiveInt(query.productId, undefined, 'productId');
  }

  const startDate = parseDate(query.startDate, 'startDate');
  const endDate = parseDate(query.endDate, 'endDate', true);

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = startDate;
    if (endDate) where.date.lte = endDate;
  }

  return where;
};

export const buildPagination = (query, defaults = { page: 1, limit: 50 }) => {
  const page = parsePositiveInt(query.page, defaults.page, 'page');
  const limit = parsePositiveInt(query.limit, defaults.limit, 'limit');
  return { page, limit };
};

export const parseStockFilter = (filter = 'all') => {
  const normalized = String(filter).toLowerCase();
  const allowed = new Set(['all', 'low', 'out']);
  if (!allowed.has(normalized)) {
    throw new InventoryError(400, 'filter must be one of all, low, out');
  }
  return normalized;
};

export const parseSearch = (search = '') => String(search).trim();
