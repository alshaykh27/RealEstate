"use client";

import { useEffect, useRef, useState } from "react";

import { AdminSidebarContent } from "@/components/admin/admin-sidebar-content";
import { admin } from "@/i18n/admin";

const DRAWER_ID = "admin-mobile-drawer";

/**
 * Mobile-only top bar + off-canvas navigation drawer. The persistent sidebar is
 * hidden below `lg`, so this is the only way to reach the nav on small screens.
 * It mirrors the desktop sidebar via `AdminSidebarContent`.
 */
export function AdminMobileNav({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !panel) return;

      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function handleDrawerClick(event: React.MouseEvent<HTMLDivElement>) {
    if ((event.target as Element).closest("a")) setOpen(false);
  }

  return (
    <header className="on-dark bg-charcoal sticky top-0 z-30 lg:hidden">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <span className="text-gold font-heading text-lg font-bold">{admin.brand}</span>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls={DRAWER_ID}
          aria-label={admin.nav.openMenu}
          className="text-on-dark-secondary hover:text-gold inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="h-6 w-6"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={admin.nav.closeMenu}
            onClick={() => setOpen(false)}
            className="bg-overlay/60 absolute inset-0"
          />

          <div
            id={DRAWER_ID}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={admin.nav.label}
            onClick={handleDrawerClick}
            className="on-dark bg-charcoal absolute inset-y-0 start-0 flex w-72 max-w-[85%] flex-col shadow-[var(--shadow-elevated)]"
          >
            <div className="flex items-center justify-end px-3 pt-3">
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label={admin.nav.closeMenu}
                className="text-on-dark-secondary hover:text-gold inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  className="h-6 w-6"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <AdminSidebarContent email={email} />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
