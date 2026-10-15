"use client";

import { useActionState, useEffect, useRef } from "react";

import { createCustomer, type CustomerActionState } from "@/app/admin/_actions/customers";
import { admin } from "@/i18n/admin";

const inputClass =
  "border-line-strong bg-surface text-ink focus-visible:outline-focus-ring w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

/** Inline form for logging a new customer. Resets itself on success. */
export function CustomerForm() {
  const [state, formAction, isPending] = useActionState<CustomerActionState, FormData>(
    createCustomer,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <section className="border-line bg-surface rounded-xl border p-5 shadow-[var(--shadow-card)]">
      <h2 className="text-ink font-heading mb-4 text-lg font-semibold">
        {admin.customers.addTitle}
      </h2>

      <form ref={formRef} action={formAction} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="customer-name" className="text-ink text-sm font-medium">
              {admin.customers.name}
            </label>
            <input id="customer-name" name="name" required className={inputClass} />
          </div>

          <div className="flex flex-col gap-1.5" dir="ltr">
            <label htmlFor="customer-phone" className="text-ink text-sm font-medium">
              {admin.customers.phone}
            </label>
            <input id="customer-phone" name="phone" required dir="ltr" className={inputClass} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="customer-notes" className="text-ink text-sm font-medium">
            {admin.customers.notes}
          </label>
          <textarea id="customer-notes" name="notes" rows={3} className={inputClass} />
        </div>

        {state.error ? (
          <p role="alert" className="text-error text-sm">
            {state.error}
          </p>
        ) : null}
        {state.ok ? <p className="text-success text-sm">{admin.customers.added}</p> : null}

        <div>
          <button type="submit" disabled={isPending} className="btn btn-primary text-sm">
            {isPending ? admin.customers.adding : admin.customers.add}
          </button>
        </div>
      </form>
    </section>
  );
}
