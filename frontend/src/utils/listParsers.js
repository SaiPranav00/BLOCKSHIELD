/**
 * List Parsing and Normalization Utilities
 * Handles raw API responses, arrays, object maps, and null/undefined values.
 */

export const parseList = (val) => {
  if (!val) return [];
  const data = val.data !== undefined ? val.data : val;
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') return Object.values(data);
  return [];
};
