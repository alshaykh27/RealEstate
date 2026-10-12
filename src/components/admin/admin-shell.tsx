import { AdminNav } from "@/components/admin/admin-nav";
import { LogoutButton } from "@/components/admin/logout-button";
import { admin } from "@/i18n/admin";

/** Shared chrome for every authenticated admin screen (sidebar + content). */
export function AdminShell({
  email,
  children,
}: {
  email: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="bg-charcoal on-dark lg:w-64 lg:shrink-0">
        <div className="flex h-full flex-col gap-8 p-4 lg:p-6">
          <div className="flex flex-col gap-0.5 px-4">
            <span className="text-gold font-heading text-lg font-bold">{admin.brand}</span>
            <span className="text-on-dark-muted text-xs">{admin.properties.title}</span>
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
      </aside>

      <main className="bg-background min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-10">{children}</main>
    </div>
  );
}
