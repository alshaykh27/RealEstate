"use client";

import { logout } from "@/app/admin/_actions/auth";
import { admin } from "@/i18n/admin";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="text-on-dark-secondary hover:text-gold w-full rounded-lg px-4 py-2 text-start text-sm font-medium transition-colors"
      >
        {admin.session.logout}
      </button>
    </form>
  );
}
