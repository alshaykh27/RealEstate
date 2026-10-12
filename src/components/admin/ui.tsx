import Link from "next/link";

import { statusLabels } from "@/lib/admin-labels";
import { cn } from "@/lib/utils";
import type { PropertyStatus } from "@/types/database";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-ink font-heading text-2xl font-bold">{title}</h1>
        {description ? <p className="text-ink-secondary mt-1 text-sm">{description}</p> : null}
      </div>
      {action ? (
        <Link href={action.href} className="btn btn-primary text-sm">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-line bg-surface rounded-xl border p-5 shadow-[var(--shadow-card)]">
      <p className="text-ink-secondary text-sm">{label}</p>
      <p className="text-ink font-heading mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

const statusClass: Record<PropertyStatus, string> = {
  available: "badge-available",
  sold: "badge-sold",
  rented: "badge-rented",
};

export function StatusBadge({ status }: { status: PropertyStatus }) {
  return <span className={cn("badge", statusClass[status])}>{statusLabels[status]}</span>;
}
