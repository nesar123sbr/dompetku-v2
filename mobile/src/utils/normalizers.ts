export function sanitizeNumericInput(value: string) {
  return value.replace(/[^\d]/g, "");
}

export function parseNumericInput(value: string) {
  const normalized = sanitizeNumericInput(value);

  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function sanitizeTimeInput(value: string) {
  const digits = value.replace(/[^\d]/g, "").slice(0, 4);

  if (!digits) {
    return "";
  }

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function getTodayDateInput() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}