import type { ListingType, PropertyStatus, PropertyType } from "@/types/database";

/** Arabic labels for the DB enum codes, shared across the admin UI. */
export const propertyTypeLabels: Record<PropertyType, string> = {
  apartment: "شقة",
  villa: "فيلا",
  townhouse: "تاون هاوس",
  duplex: "دوبلكس",
  penthouse: "بنتهاوس",
  studio: "استوديو",
  chalet: "شاليه",
  office: "مكتب",
  shop: "محل تجاري",
  land: "أرض",
};

export const listingTypeLabels: Record<ListingType, string> = {
  sale: "للبيع",
  rent: "للإيجار",
};

export const statusLabels: Record<PropertyStatus, string> = {
  available: "متاح",
  sold: "مُباع",
  rented: "مؤجّر",
};

export const propertyTypeOptions = Object.entries(propertyTypeLabels) as [PropertyType, string][];
export const listingTypeOptions = Object.entries(listingTypeLabels) as [ListingType, string][];
export const statusOptions = Object.entries(statusLabels) as [PropertyStatus, string][];
