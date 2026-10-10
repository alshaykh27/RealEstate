import { whatsappUrl } from "@/lib/contact";

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.09 3.2 5.07 4.49.71.31 1.26.49 1.69.63.71.23 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z" />
      <path d="M12.01 2.01c-5.5 0-9.97 4.47-9.97 9.97 0 1.76.46 3.41 1.27 4.85L2 22l5.31-1.39a9.9 9.9 0 0 0 4.7 1.2h.01c5.5 0 9.97-4.47 9.97-9.97 0-2.66-1.04-5.17-2.92-7.05a9.9 9.9 0 0 0-7.06-2.78zm5.83 15.8a8.16 8.16 0 0 1-5.83 2.42h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.1.81.83-3.02-.2-.31a8.13 8.13 0 0 1-1.25-4.35c0-4.52 3.68-8.2 8.2-8.2 2.19 0 4.25.86 5.8 2.4a8.15 8.15 0 0 1 2.4 5.8c0 4.53-3.68 8.21-8.19 8.21z" />
    </svg>
  );
}

export function WhatsAppFab({
  number,
  label,
}: {
  number: string | null | undefined;
  label: string;
}) {
  const href = whatsappUrl(number);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="btn btn-whatsapp shadow-elevated fixed end-5 bottom-5 z-50 rounded-full p-3.5"
    >
      <WhatsAppIcon />
    </a>
  );
}
