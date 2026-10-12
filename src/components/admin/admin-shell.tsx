import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminSidebarContent } from "@/components/admin/admin-sidebar-content";

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
      <aside className="on-dark bg-charcoal hidden lg:flex lg:w-64 lg:shrink-0">
        <AdminSidebarContent email={email} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileNav email={email} />
        <main className="bg-background flex-1 px-4 py-6 lg:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
