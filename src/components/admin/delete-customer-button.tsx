"use client";

import { useActionState } from "react";

import { deleteCustomer, type CustomerActionState } from "@/app/admin/_actions/customers";
import { admin } from "@/i18n/admin";

/** Deletes a logged customer after a plain confirm dialog (low-stakes data). */
export function DeleteCustomerButton({ id }: { id: string }) {
  const [, formAction, isPending] = useActionState<CustomerActionState, FormData>(
    deleteCustomer,
    {},
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(admin.customers.deleteConfirm)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={isPending}
        className="text-error text-sm font-medium hover:underline disabled:opacity-50"
      >
        {admin.customers.delete}
      </button>
    </form>
  );
}
