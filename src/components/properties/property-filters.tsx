"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

export interface FilterAreaOption {
  slug: string;
  name: string;
}

export interface FilterTypeOption {
  value: string;
  label: string;
}

export interface PropertyFiltersLabels {
  heading: string;
  listingType: string;
  propertyType: string;
  area: string;
  bedrooms: string;
  price: string;
  size: string;
  all: string;
  min: string;
  max: string;
  apply: string;
  reset: string;
  sort: string;
  sortNewest: string;
  sortPriceAsc: string;
  sortPriceDesc: string;
  listingSale: string;
  listingRent: string;
}

interface FilterValues {
  listingType: string;
  propertyType: string;
  area: string;
  bedrooms: string;
  minPrice: string;
  maxPrice: string;
  minArea: string;
  maxArea: string;
  sort: string;
}

const EMPTY: FilterValues = {
  listingType: "",
  propertyType: "",
  area: "",
  bedrooms: "",
  minPrice: "",
  maxPrice: "",
  minArea: "",
  maxArea: "",
  sort: "newest",
};

const fieldClass =
  "border-line bg-surface text-ink rounded-lg border px-3 py-2 text-sm focus-visible:outline-none";
const labelClass = "text-ink-secondary flex flex-col gap-1 text-xs font-medium";

export function PropertyFilters({
  areas,
  propertyTypes,
  bedrooms,
  labels,
}: {
  areas: FilterAreaOption[];
  propertyTypes: FilterTypeOption[];
  bedrooms: number[];
  labels: PropertyFiltersLabels;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [values, setValues] = useState<FilterValues>(() => ({
    listingType: searchParams.get("listingType") ?? "",
    propertyType: searchParams.get("propertyType") ?? "",
    area: searchParams.get("area") ?? "",
    bedrooms: searchParams.get("bedrooms") ?? "",
    minPrice: searchParams.get("minPrice") ?? "",
    maxPrice: searchParams.get("maxPrice") ?? "",
    minArea: searchParams.get("minArea") ?? "",
    maxArea: searchParams.get("maxArea") ?? "",
    sort: searchParams.get("sort") ?? "newest",
  }));

  function update<K extends keyof FilterValues>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function buildQuery(): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
      if (!value) continue;
      if (key === "sort" && value === "newest") continue;
      params.set(key, value);
    }
    return params.toString();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = buildQuery();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function onReset() {
    setValues({ ...EMPTY });
    router.push(pathname);
  }

  return (
    <form
      method="get"
      action={pathname}
      onSubmit={onSubmit}
      className="border-line bg-surface shadow-card rounded-2xl border p-5"
    >
      <h2 className="text-ink font-heading mb-4 text-lg font-semibold">{labels.heading}</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className={labelClass}>
          {labels.listingType}
          <select
            value={values.listingType}
            onChange={(event) => update("listingType", event.target.value)}
            className={fieldClass}
          >
            <option value="">{labels.all}</option>
            <option value="sale">{labels.listingSale}</option>
            <option value="rent">{labels.listingRent}</option>
          </select>
        </label>

        <label className={labelClass}>
          {labels.propertyType}
          <select
            value={values.propertyType}
            onChange={(event) => update("propertyType", event.target.value)}
            className={fieldClass}
          >
            <option value="">{labels.all}</option>
            {propertyTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          {labels.area}
          <select
            value={values.area}
            onChange={(event) => update("area", event.target.value)}
            className={fieldClass}
          >
            <option value="">{labels.all}</option>
            {areas.map((area) => (
              <option key={area.slug} value={area.slug}>
                {area.name}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          {labels.bedrooms}
          <select
            value={values.bedrooms}
            onChange={(event) => update("bedrooms", event.target.value)}
            className={fieldClass}
          >
            <option value="">{labels.all}</option>
            {bedrooms.map((count) => (
              <option key={count} value={String(count)}>
                {count}+
              </option>
            ))}
          </select>
        </label>

        <fieldset className="flex flex-col gap-1">
          <legend className="text-ink-secondary mb-1 text-xs font-medium">{labels.price}</legend>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder={labels.min}
              aria-label={`${labels.price} ${labels.min}`}
              value={values.minPrice}
              onChange={(event) => update("minPrice", event.target.value)}
              className={fieldClass}
            />
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder={labels.max}
              aria-label={`${labels.price} ${labels.max}`}
              value={values.maxPrice}
              onChange={(event) => update("maxPrice", event.target.value)}
              className={fieldClass}
            />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-1">
          <legend className="text-ink-secondary mb-1 text-xs font-medium">{labels.size}</legend>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder={labels.min}
              aria-label={`${labels.size} ${labels.min}`}
              value={values.minArea}
              onChange={(event) => update("minArea", event.target.value)}
              className={fieldClass}
            />
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder={labels.max}
              aria-label={`${labels.size} ${labels.max}`}
              value={values.maxArea}
              onChange={(event) => update("maxArea", event.target.value)}
              className={fieldClass}
            />
          </div>
        </fieldset>

        <label className={labelClass}>
          {labels.sort}
          <select
            value={values.sort}
            onChange={(event) => update("sort", event.target.value)}
            className={fieldClass}
          >
            <option value="newest">{labels.sortNewest}</option>
            <option value="price-asc">{labels.sortPriceAsc}</option>
            <option value="price-desc">{labels.sortPriceDesc}</option>
          </select>
        </label>

        <div className="flex items-end gap-2">
          <button type="submit" className="btn btn-primary flex-1">
            {labels.apply}
          </button>
          <button type="button" onClick={onReset} className="btn btn-secondary-light">
            {labels.reset}
          </button>
        </div>
      </div>
    </form>
  );
}
