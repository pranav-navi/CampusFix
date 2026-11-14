// Helpers for server-side pagination, sorting and search

const escapeRegex = (s = '') => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function parsePagination(query, { defaultLimit = 10, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Builds a Mongo sort object from ?sortBy=field&order=asc|desc,
 * only allowing whitelisted fields.
 */
function parseSort(query, allowed, fallback = { createdAt: -1 }) {
  const { sortBy, order } = query;
  if (!sortBy || !allowed.includes(sortBy)) return fallback;
  return { [sortBy]: order === 'asc' || order === 'ascend' ? 1 : -1 };
}

const paginated = (items, total, page, limit) => ({
  items,
  pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
});

module.exports = { escapeRegex, parsePagination, parseSort, paginated };
