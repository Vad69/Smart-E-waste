import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

export const DEFAULT_TZ = process.env.TZ || process.env.TIMEZONE || 'Asia/Kolkata';

export function formatInTz(ts, format = 'YYYY-MM-DD HH:mm') {
	if (!ts) return '—';
	return dayjs.tz(ts, DEFAULT_TZ).format(format);
}

export function nowInTz(format = 'YYYY-MM-DD HH:mm') {
	return dayjs().tz(DEFAULT_TZ).format(format);
}