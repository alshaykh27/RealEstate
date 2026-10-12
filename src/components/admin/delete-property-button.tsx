"use client";

import { useActionState, useState } from "react";

import { deleteProperty, type PropertyActionState } from "@/app/admin/_actions/properties";
import { admin } from "@/i18n/admin";

export function DeletePropertyButton({ id, titleEn }: { id: string; titleEn: string }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [state, formAction, isPending] = useActionState<PropertyActionState, FormData>(
    deleteProperty,
    {},
  );

  const matches = confirmText.trim() === "حذف";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-error text-sm font-medium hover:underline"
      >
        {admin.properties.delete}
      </button>

      {open ? (
        <div
          className="bg-overlay/50 fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-property-title"
        >
          <div className="bg-surface w-full max-w-md rounded-2xl p-6 shadow-[var(--shadow-elevated)]">
            <h2 id="delete-property-title" className="text-ink font-heading text-lg font-bold">
              {admin.properties.confirmDeleteTitle}
            </h2>
            <p className="text-ink-secondary mt-2 text-sm">{admin.properties.confirmDeleteBody}</p>
            <p className="text-ink mt-3 font-medium" dir="ltr">
              {titleEn}
            </p>

            <form action={formAction} className="mt-5 flex flex-col gap-4">
              <input type="hidden" name="id" value={id} />
              <div className="flex flex-col gap-2">
                <label htmlFor={`confirm-${id}`} className="text-ink text-sm font-medium">
                  {admin.properties.confirmDeletePrompt}
                </label>
                <input
                  id={`confirm-${id}`}
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                  className="border-line-strong bg-surface text-ink focus-visible:outline-focus-ring rounded-lg border px-4 py-2.5 text-sm outline-none focus-visible:outline-2"
                />
              </div>

              {state.error ? (
                <p role="alert" className="text-error text-sm">
                  {state.error}
                </p>
              ) : null}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn btn-secondary-light text-sm"
                >
                  {admin.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={!matches || isPending}
                  className="btn bg-error text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? admin.properties.deleting : admin.properties.confirmDelete}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
