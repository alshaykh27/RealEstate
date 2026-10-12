export type PropertyType =
  | "apartment"
  | "villa"
  | "townhouse"
  | "duplex"
  | "penthouse"
  | "studio"
  | "chalet"
  | "office"
  | "shop"
  | "land";

export type ListingType = "sale" | "rent";

export type PropertyStatus = "available" | "sold" | "rented";

export interface Area {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string | null;
  description_en: string;
  description_ar: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PropertyImage {
  id: string;
  property_id: string;
  storage_path: string;
  alt_en: string;
  alt_ar: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number;
  is_cover: boolean;
  sort_order: number;
  created_at: string;
}

export interface Property {
  id: string;
  slug: string;
  area_id: string | null;
  property_type: PropertyType;
  listing_type: ListingType;
  status: PropertyStatus;
  title_en: string;
  title_ar: string | null;
  description_en: string;
  description_ar: string | null;
  address_en: string;
  address_ar: string | null;
  compound_en: string | null;
  compound_ar: string | null;
  features_en: string[];
  features_ar: string[] | null;
  meta_title_en: string | null;
  meta_title_ar: string | null;
  meta_description_en: string | null;
  meta_description_ar: string | null;
  price: number;
  currency: string;
  area_sqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  year_built: number | null;
  latitude: number | null;
  longitude: number | null;
  is_published: boolean;
  is_featured: boolean;
  is_sample: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  deleted_at: string | null;
}

export interface PropertyWithRelations extends Property {
  area: Area | null;
  property_images: PropertyImage[];
}

export type PropertyAreaSummary = Pick<Area, "id" | "slug" | "name_en" | "name_ar">;

export type PropertyListItem = Pick<
  Property,
  | "id"
  | "slug"
  | "title_en"
  | "title_ar"
  | "compound_en"
  | "compound_ar"
  | "property_type"
  | "listing_type"
  | "status"
  | "price"
  | "currency"
  | "area_sqm"
  | "bedrooms"
  | "bathrooms"
  | "is_featured"
  | "created_at"
> & {
  area: PropertyAreaSummary | null;
  property_images: PropertyImage[];
};

export interface SiteSettings {
  id: number;
  brand_name_en: string;
  brand_name_ar: string | null;
  hero_headline_en: string;
  hero_headline_ar: string | null;
  hero_subhead_en: string;
  hero_subhead_ar: string | null;
  about_en: string | null;
  about_ar: string | null;
  whatsapp_number: string | null;
  phone: string | null;
  email: string | null;
  facebook_url: string | null;
  logo_path: string | null;
  default_og_image: string | null;
  promo_video_url: string | null;
  updated_at: string;
}
