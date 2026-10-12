"use client";

import { useActionState } from "react";

import { login, type LoginState } from "@/app/admin/_actions/auth";
import { admin } from "@/i18n/admin";

const inputClass =
  "border-line-strong bg-surface text-ink focus-visible:outline-focus-ring w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-ink text-sm font-medium">
          {admin.login.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          dir="ltr"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-ink text-sm font-medium">
          {admin.login.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          dir="ltr"
          className={inputClass}
        />
      </div>

      {state.error ? (
        <p role="alert" className="bg-error-surface text-error rounded-lg px-4 py-3 text-sm">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        className="btn btn-secondary-dark w-full"
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? admin.login.submitting : admin.login.submit}
      </button>
    </form>
  );
}
