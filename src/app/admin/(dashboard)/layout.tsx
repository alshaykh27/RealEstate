import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth";

/** Gate + chrome for all authenticated admin routes (the login page is outside). */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const adminUser = await requireAdmin();
  return <AdminShell email={adminUser.email}>{children}</AdminShell>;
}
