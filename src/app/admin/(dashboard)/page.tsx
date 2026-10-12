import Link from "next/link";

import { PageHeader, StatCard, StatusBadge } from "@/components/admin/ui";
import { admin } from "@/i18n/admin";
import { listingTypeLabels, propertyTypeLabels } from "@/lib/admin-labels";
import { formatDate, formatPrice } from "@/lib/content";
import { getAdminProperties, getDashboardStats } from "@/lib/data/admin";

export default async function AdminDashboardPage() {
  const [stats, properties] = await Promise.all([getDashboardStats(), getAdminProperties()]);
  const recent = properties.slice(0, 5);

  const cards = [
    { label: admin.dashboard.total, value: stats.total },
    { label: admin.dashboard.published, value: stats.published },
    { label: admin.dashboard.drafts, value: stats.drafts },
    { label: admin.dashboard.available, value: stats.available },
    { label: admin.dashboard.sold, value: stats.sold },
    { label: admin.dashboard.rented, value: stats.rented },
  ];

  return (
    <div>
      <PageHeader
        title={admin.dashboard.title}
        action={{ href: "/admin/properties/new", label: admin.properties.addNew }}
      />

      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>

      <section className="border-line bg-surface rounded-xl border shadow-[var(--shadow-card)]">
        <header className="border-line flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-ink font-heading text-lg font-semibold">{admin.dashboard.recent}</h2>
          <Link href="/admin/properties" className="text-gold-deep text-sm font-medium">
            {admin.dashboard.viewAll}
          </Link>
        </header>

        {recent.length === 0 ? (
          <p className="text-ink-secondary px-5 py-8 text-sm">{admin.dashboard.empty}</p>
        ) : (
          <ul className="divide-line divide-y">
            {recent.map((property) => (
              <li key={property.id}>
                <Link
                  href={`/admin/properties/${property.id}/edit`}
                  className="hover:bg-surface-cream/60 flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-ink truncate font-medium">{property.title_en}</p>
                    <p className="text-ink-muted mt-0.5 text-xs">
                      {propertyTypeLabels[property.property_type]} ·{" "}
                      {listingTypeLabels[property.listing_type]} ·{" "}
                      {formatPrice("ar", property.price, property.currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-ink-muted text-xs">
                      {formatDate("ar", property.updated_at)}
                    </span>
                    <StatusBadge status={property.status} />
                    {property.is_published ? null : (
                      <span className="badge badge-sold">{admin.properties.draft}</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
