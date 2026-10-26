export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string, timeFormat: "12h" | "24h" = "12h"): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: timeFormat === "12h",
  });
  return `${formatDate(iso)}, ${time}`;
}
