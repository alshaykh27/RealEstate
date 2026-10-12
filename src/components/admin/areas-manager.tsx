"use client";

import { useState } from "react";

import { updateAreas } from "@/app/admin/_actions/settings";
import { admin } from "@/i18n/admin";
import type { Area } from "@/types/database";

interface Item {
  id: string;
  name: string;
  isActive: boolean;
}

export function AreasManager({ areas }: { areas: Area[] }) {
  const [items, setItems] = useState<Item[]>(() =>
    areas.map((area) => ({
      id: area.id,
      name: area.name_ar || area.name_en,
      isActive: area.is_active,
    })),
  );
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    </section>
  );
}
