import { PageHeader } from "@/components/admin/ui";
import { PropertyForm } from "@/components/admin/property-form";
import { admin } from "@/i18n/admin";
import { createProperty } from "@/app/admin/_actions/properties";
import { getAdminAreas, getAdminCompounds } from "@/lib/data/admin";

export const metadata = { title: admin.form.newTitle };

export default async function NewPropertyPage() {
  const [areas, compounds] = await Promise.all([getAdminAreas(), getAdminCompounds()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={admin.form.newTitle} />
      <p className="text-ink-muted rounded-lg bg-[var(--color-surface-cream)] px-4 py-3 text-sm">
        {admin.images.stagedHint}
      </p>
      <PropertyForm mode="create" action={createProperty} areas={areas} compounds={compounds} />
    </div>
  );
}
