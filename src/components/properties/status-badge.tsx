import type { PropertyStatus } from "@/types/database";

const STATUS_CLASS: Record<PropertyStatus, string> = {
  available: "badge-available",
  sold: "badge-sold",
  rented: "badge-rented",
};

export function StatusBadge({
  status,
  labels,
}: {
  status: PropertyStatus;
  labels: Record<PropertyStatus, string>;
}) {
  return <span className={`badge ${STATUS_CLASS[status]}`}>{labels[status]}</span>;
}
