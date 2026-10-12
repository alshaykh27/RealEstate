import { notFound } from "next/navigation";

import { PropertyForm } from "@/components/admin/property-form";
import { ImageManager } from "@/components/admin/image-manager";
import { PageHeader } from "@/components/admin/ui";
import { updateProperty } from "@/app/admin/_actions/properties";
import type { ImageRow } from "@/app/admin/_actions/images";
import { admin } from "@/i18n/admin";
import { getAdminAreas, getAdminCompounds, getAdminProperty } from "@/lib/data/admin";

export const metadata = { title: admin.form.editTitle };

export default async function EditPropertyPage({
  params,
}: PageProps<"/admin/properties/[id]/edit">) {
  const { id } = await params;
  const [property, areas, compounds] = await Promise.all([
    getAdminProperty(id),
    getAdminAreas(),
    getAdminCompounds(),
  ]);

  if (!property) notFound();

  const images = [...property.property_images].sort(
    (a, b) => a.sort_order - b.sort_order,
  ) as ImageRow[];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={admin.form.editTitle} />
      <PropertyForm
        mode="update"
        action={updateProperty}
        areas={areas}
        compounds={compounds}
        defaults={property}
      />
      <ImageManager propertyId={property.id} initialImages={images} />
    </div>
  );
}
