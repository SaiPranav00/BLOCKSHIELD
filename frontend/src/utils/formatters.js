/**
 * Formatting Utilities for DIDs, Timestamps, and Status Badges
 */

export const formatDID = (did, maxLen = 32) => {
  if (!did || typeof did !== 'string') return 'N/A';
  if (did.length <= maxLen) return did;
  return `${did.slice(0, 18)}...${did.slice(-6)}`;
};

export const formatTimestamp = (ts, fallback = 'N/A') => {
  if (!ts) return fallback;
  try {
    const num = Number(ts);
    if (!isNaN(num) && num > 0) {
      const millis = num < 10000000000 ? num * 1000 : num;
      return new Date(millis).toLocaleString();
    }
    const d = new Date(ts);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString();
    }
    return String(ts);
  } catch {
    return fallback;
  }
};

export const getStatusBadgeClass = (status) => {
  const s = String(status || '').toUpperCase();
  switch (s) {
    case 'ACTIVE':
    case 'APPROVED':
    case 'ONLINE':
      return 'badge-active';
    case 'REVOKED':
    case 'REJECTED':
    case 'OFFLINE':
      return 'badge-revoked';
    case 'PENDING':
    case 'TRANSFER_PENDING':
      return 'badge-pending';
    default:
      return 'badge-default';
  }
};
