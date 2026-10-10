import type { ReactNode } from "react";

import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { PropertyCard } from "@/components/properties/property-card";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { PropertyListItem } from "@/types/database";

export function PropertyGrid({
  properties,
  locale,
  dict,
  empty,
}: {
  properties: PropertyListItem[];
  locale: Locale;
  dict: Dictionary;
  empty?: ReactNode;
}) {
  if (properties.length === 0) {
    return <div className="py-16 text-center">{empty}</div>;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {properties.map((property, index) => (
        <Reveal key={property.id} className="h-full" delay={Math.min(index, 5) * 0.08}>
          <TiltCard>
            <PropertyCard property={property} locale={locale} dict={dict} />
          </TiltCard>
        </Reveal>
      ))}
    </div>
  );
}
