import type { Response } from 'express';

// One way to answer a failed request (D-065, SECURITY S-12): the reader or editor gets a
// generic Arabic message plus a stable code; the real error (Prisma text, stack, SMTP reply)
// goes to the backend log only, tagged with the method and path so it can be found.
const GENERIC: Record<number, string> = {
  400: 'طلب غير صالح',
  404: 'غير موجود',
  413: 'حجم الطلب أكبر من المسموح',
  502: 'تعذّر الاتصال بالخدمة الخارجية',
  503: 'الخدمة غير متاحة مؤقتاً',
};
const FALLBACK = 'حدث خطأ في الخادم، حاول مرة أخرى';

export function sendError(
  res: Response,
  e: unknown,
  { status = 500, code = 'SERVER_ERROR', message }: { status?: number; code?: string; message?: string } = {},
) {
  const req = res.req;
  const where = `[api] ${code} ${status} ${req?.method || '-'} ${(req?.originalUrl || '-').split('?')[0]}`;
  // The client's own mistakes (4xx) get one short line; server failures keep the full error and stack.
  if (status < 500) console.warn(`${where}: ${String((e as Error)?.message ?? e).slice(0, 200)}`);
  else console.error(`${where}:`, e);
  if (res.headersSent) return;
  res.status(status).json({ success: false, error: message || GENERIC[status] || FALLBACK, code });
}
