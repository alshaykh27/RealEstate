import Link from "next/link";

import { DeletePropertyButton } from "@/components/admin/delete-property-button";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { PropertyImage } from "@/components/properties/property-image";
import { admin } from "@/i18n/admin";
import { listingTypeLabels, propertyTypeLabels } from "@/lib/admin-labels";
import {
  coverStoragePath,
  formatDate,
  formatPrice,
  hasValue,
  propertyImageUrl,
} from "@/lib/content";
import { getAdminProperties } from "@/lib/data/admin";

export default async function AdminPropertiesPage() {
  const properties = await getAdminProperties();

  return (
    <div>
      <PageHeader
        title={admin.properties.title}
        action={{ href: "/admin/properties/new", label: admin.properties.addNew }}
      />

      {properties.length === 0 ? (
        <p className="border-line bg-surface text-ink-secondary rounded-xl border px-5 py-10 text-center text-sm">
          {admin.properties.empty}
        </p>
      ) : (
        <div className="border-line bg-surface overflow-x-auto rounded-xl border shadow-[var(--shadow-card)]">
          <table className="w-full min-w-[52rem] border-collapse text-start text-sm">
            <thead>
              <tr className="border-line text-ink-secondary border-b text-start text-xs">
                <th className="px-4 py-3 text-start font-medium">{admin.properties.colTitle}</th>
                <th className="px-4 py-3 text-start font-medium">{admin.properties.colArea}</th>
                <th className="px-4 py-3 text-start font-medium">{admin.properties.colType}</th>
                <th className="px-4 py-3 text-start font-medium">{admin.properties.colPrice}</th>
                <th className="px-4 py-3 text-start font-medium">{admin.properties.colStatus}</th>
                <th className="px-4 py-3 text-start font-medium">{admin.properties.colUpdated}</th>
                <th className="px-4 py-2 text-end font-medium">{admin.common.edit}</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {properties.map((property) => {
                const cover = coverStoragePath(property.property_images);
                const missingArabic = !hasValue(property.title_ar);

                return (
                  <tr key={property.id} className="hover:bg-surface-cream/50 align-middle">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-surface-cream relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                          <PropertyImage
                            src={cover ? propertyImageUrl(cover) : null}
                            alt={property.title_en}
                            sizes="48px"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-ink max-w-[16rem] truncate font-medium">
                            {property.title_en}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            {property.is_sample ? (
                              <span className="badge badge-sold">{admin.properties.sample}</span>
                            ) : null}
                            {missingArabic ? (
                              <span className="badge badge-rented">
                                {admin.properties.missingArabic}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="text-ink-secondary px-5 py-3">
                      <div className="flex flex-col">
                        <span>{property.area?.name_en ?? admin.common.none}</span>
                        {property.compound_en ? (
                          <span className="text-ink-muted text-xs">{property.compound_en}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="text-ink-secondary px-5 py-3">
                      {propertyTypeLabels[property.property_type]}
                    </td>
                    <td className="text-ink px-5 py-3 whitespace-nowrap">
                      {formatPrice("ar", property.price, property.currency)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={property.status} />
                        <span
                          className={`badge ${
                            property.is_published ? "badge-available" : "badge-sold"
                          }`}
                        >
                          {property.is_published
                            ? admin.properties.published
                            : admin.properties.draft}
                        </span>
                        {property.is_featured ? (
                          <span className="badge badge-available">{admin.properties.featured}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="text-ink-muted px-5 py-3 text-xs">
                      {formatDate("ar", property.updated_at)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-4">
                        <Link
                          href={`/admin/properties/${property.id}/edit`}
                          className="text-gold-deep text-sm font-medium hover:underline"
                        >
                          {admin.properties.edit}
                        </Link>
                        <DeletePropertyButton id={property.id} titleEn={property.title_en} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
