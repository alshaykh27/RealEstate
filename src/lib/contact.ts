export function whatsappUrl(number: string | null | undefined, message?: string): string | null {
  if (!number) return null;
  const digits = number.replace(/[^\d]/g, "");
  if (!digits) return null;
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${query}`;
}

export function telUrl(number: string | null | undefined): string | null {
  if (!number) return null;
  const cleaned = number.replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : null;
}

export function mailtoUrl(email: string | null | undefined): string | null {
  return email ? `mailto:${email}` : null;
}
