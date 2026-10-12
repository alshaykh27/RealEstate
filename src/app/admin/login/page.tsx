import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/login-form";
import { admin } from "@/i18n/admin";
import { getAdminUser } from "@/lib/auth";

export const metadata = { title: admin.login.title };

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const adminUser = await getAdminUser();
  if (adminUser) redirect("/admin");

  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "";

  return (
    <main className="bg-obsidian flex min-h-screen items-center justify-center px-4 py-12">
      <div className="bg-surface w-full max-w-md rounded-2xl p-8 shadow-[var(--shadow-elevated)]">
        <div className="mb-6 flex flex-col gap-1 text-center">
          <span className="text-gold-deep font-heading text-sm font-semibold">{admin.brand}</span>
          <h1 className="text-ink font-heading text-xl font-bold">{admin.login.title}</h1>
          <p className="text-ink-secondary text-sm">{admin.login.subtitle}</p>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
