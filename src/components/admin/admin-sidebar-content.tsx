"use client";

import { AdminNav } from "@/components/admin/admin-nav";
import { LogoutButton } from "@/components/admin/logout-button";
import { admin } from "@/i18n/admin";

/**
 * The sidebar's contents (brand, primary nav, session + logout). Rendered both
 * inside the persistent desktop `<aside>` and the mobile drawer so the two never
 * drift apart.
 */
export function AdminSidebarContent({ email }: { email: string | null }) {
  return (
    <div className="flex h-full w-full flex-col gap-8 p-6">
      <div className="flex flex-col gap-0.5 px-4">
        <span className="text-gold font-heading text-lg font-bold">{admin.brand}</span>
        <span className="text-on-dark-muted text-xs">{admin.product}</span>
      </div>

      <AdminNav />

      <div className="border-line-dark mt-auto flex flex-col gap-1 border-t pt-4">
        {email ? (
          <span className="text-on-dark-muted px-4 text-xs" dir="ltr">
            {email}
          </span>
        ) : null}
        <LogoutButton />
      </div>
    </div>
  );
}
