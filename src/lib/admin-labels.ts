import type { ListingType, PropertyStatus, PropertyType } from "@/types/database";

/** Arabic labels for the DB enum codes, shared across the admin UI. */
export const propertyTypeLabels: Record<PropertyType, string> = {
  apartment: "شقة",
  duplex: "دوبلكس",
  penthouse: "بنتهاوس",
  studio: "استوديو",
  villa: "فيلا",
  twin_house: "توين هاوس",
  quattro_villa: "كواترو فيلا",
  standalone_villa: "فيلا مستقلة",
  townhouse: "تاون هاوس",
  family_house: "فاميلي هاوس",
  chalet: "شاليه",
  land: "أرض",
  office: "مكتب",
  shop: "محل تجاري",
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
