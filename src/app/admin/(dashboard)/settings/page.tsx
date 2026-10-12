import { AreasManager } from "@/components/admin/areas-manager";
import { SettingsForm } from "@/components/admin/settings-form";
import { PageHeader } from "@/components/admin/ui";
import { admin } from "@/i18n/admin";
import { getAdminAreas, getAdminSettings } from "@/lib/data/admin";

export const metadata = { title: admin.settings.title };

export default async function AdminSettingsPage() {
  const [settings, areas] = await Promise.all([getAdminSettings(), getAdminAreas()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={admin.settings.title} />
      <SettingsForm settings={settings} />
      <AreasManager areas={areas} />
    </div>
  );
}
