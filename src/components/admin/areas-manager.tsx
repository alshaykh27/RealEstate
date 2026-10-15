"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { createArea, updateAreas, type AreaActionState } from "@/app/admin/_actions/settings";
import { admin } from "@/i18n/admin";
import type { Area } from "@/types/database";

interface Item {
  id: string;
  name: string;
  isActive: boolean;
}

const inputClass =
  "border-line-strong bg-surface text-ink focus-visible:outline-focus-ring w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

/** Inline form for creating a brand-new area. Resets itself on success. */
function AddAreaForm() {
  const [state, formAction, isPending] = useActionState<AreaActionState, FormData>(createArea, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="border-line mt-6 border-t pt-5">
      <h3 className="text-ink mb-3 text-sm font-semibold">{admin.areas.addTitle}</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5" dir="ltr">
          <label htmlFor="area-name-en" className="text-ink text-start text-sm font-medium">
            {admin.areas.nameEn}
          </label>
          <input id="area-name-en" name="name_en" required dir="ltr" className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="area-name-ar" className="text-ink text-sm font-medium">
            {admin.areas.nameAr}
          </label>
          <input id="area-name-ar" name="name_ar" className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5" dir="ltr">
          <label htmlFor="area-description-en" className="text-ink text-start text-sm font-medium">
            {admin.areas.descriptionEn}
          </label>
          <textarea
            id="area-description-en"
            name="description_en"
            required
            dir="ltr"
            rows={2}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="area-description-ar" className="text-ink text-sm font-medium">
            {admin.areas.descriptionAr}
          </label>
          <textarea
            id="area-description-ar"
            name="description_ar"
            rows={2}
            className={inputClass}
          />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-error mt-3 text-sm">
          {state.error}
        </p>
      ) : null}
      {state.ok ? <p className="text-success mt-3 text-sm">{admin.areas.addSuccess}</p> : null}

      <div className="mt-4">
        <button type="submit" disabled={isPending} className="btn btn-primary text-sm">
          {isPending ? admin.areas.addSubmitting : admin.areas.addSubmit}
        </button>
      </div>
    </form>
  );
}

function toItems(areas: Area[]): Item[] {
  return areas.map((area) => ({
    id: area.id,
    name: area.name_ar || area.name_en,
    isActive: area.is_active,
  }));
}

export function AreasManager({ areas }: { areas: Area[] }) {
  const [items, setItems] = useState<Item[]>(() => toItems(areas));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync when the server gives us a fresh `areas` list (e.g. right after
  // AddAreaForm below creates one — Next re-renders this page's server
  // component after the action, which passes a new `areas` array down). Done
  // during render (not an Effect) per React's "adjusting state when a prop
  // changes" pattern, so it doesn't cause an extra render pass.
  const [prevAreas, setPrevAreas] = useState(areas);
  if (areas !== prevAreas) {
    setPrevAreas(areas);
    setItems(toItems(areas));
    setSaved(false);
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    setSaved(false);
  }

  function toggle(id: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isActive: !item.isActive } : item)),
    );
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const result = await updateAreas(
      items.map((item, index) => ({ id: item.id, isActive: item.isActive, sortOrder: index })),
    );
    if ("error" in result) setError(result.error);
    else setSaved(true);
    setBusy(false);
  }

  return (
    <section className="border-line bg-surface rounded-xl border p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4">
        <h2 className="text-ink font-heading text-lg font-semibold">{admin.areas.title}</h2>
        <p className="text-ink-muted mt-1 text-xs">{admin.areas.hint}</p>
      </div>

      <ul className="divide-line divide-y">
        {items.map((item, index) => (
          <li key={item.id} className="flex items-center gap-3 py-3">
            <div className="flex flex-col">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                className="text-ink-muted hover:text-ink text-xs disabled:opacity-30"
                aria-label={admin.areas.moveUp}
              >
                ▲
              </button>
              <button
                type="button"
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
                className="text-ink-muted hover:text-ink text-xs disabled:opacity-30"
                aria-label={admin.areas.moveDown}
              >
                ▼
              </button>
            </div>

            <span className="text-ink flex-1 text-sm font-medium">{item.name}</span>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.isActive}
                onChange={() => toggle(item.id)}
                className="h-4 w-4"
              />
              {admin.areas.active}
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center gap-4">
        <button type="button" onClick={save} disabled={busy} className="btn btn-primary text-sm">
          {busy ? admin.common.saving : admin.common.saveChanges}
        </button>
        {saved ? <span className="text-success text-sm">{admin.areas.saved}</span> : null}
        {error ? (
          <span role="alert" className="text-error text-sm">
            {error}
          </span>
        ) : null}
      </div>

      <AddAreaForm />
    </section>
  );
}
