/** Order / inquiry lifecycle statuses */

export const ORDER_STATUSES = [
  "new",
  "processing",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
  "rejected",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function isOrderStatus(v: string): v is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(v);
}

/** Step index for progress bar (cancelled/rejected are terminal side-paths) */
export function statusProgress(status: string): number {
  switch (status) {
    case "new":
      return 0;
    case "processing":
      return 1;
    case "confirmed":
      return 2;
    case "shipped":
      return 3;
    case "delivered":
      return 4;
    default:
      return -1;
  }
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "new":
      return "bg-sky-50 text-sky-800 border-sky-200";
    case "processing":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "confirmed":
      return "bg-violet-50 text-violet-800 border-violet-200";
    case "shipped":
      return "bg-blue-50 text-blue-800 border-blue-200";
    case "delivered":
      return "bg-green-soft text-green-deep border-green/30";
    case "cancelled":
      return "bg-slate-100 text-slate-600 border-slate-200";
    case "rejected":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

export type StatusHistoryEntry = {
  status: string;
  at: string; // ISO
  note?: string;
};

export function parseStatusHistory(raw: string | null | undefined): StatusHistoryEntry[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function appendStatusHistory(
  raw: string | null | undefined,
  status: string,
  note?: string
): string {
  const list = parseStatusHistory(raw);
  list.push({
    status,
    at: new Date().toISOString(),
    ...(note ? { note } : {}),
  });
  return JSON.stringify(list);
}
