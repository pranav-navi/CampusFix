import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export const fromNow = (d) => (d ? dayjs(d).fromNow() : '—');
export const formatDate = (d) => (d ? dayjs(d).format('D MMM YYYY') : '—');
export const formatDateTime = (d) => (d ? dayjs(d).format('D MMM YYYY, h:mm A') : '—');

export const formatHours = (h) => {
  if (h === null || h === undefined) return '—';
  if (h < 24) return `${h} h`;
  const days = h / 24;
  return `${days.toFixed(days < 10 ? 1 : 0)} days`;
};

// Locally stored uploads come back as "/uploads/..."; Cloudinary returns absolute URLs
const API_ORIGIN = import.meta.env.VITE_API_URL || '';
export const fileUrl = (url) => (!url ? '' : /^https?:\/\//.test(url) ? url : `${API_ORIGIN}${url}`);

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export const apiError = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.message || err?.message || fallback;
