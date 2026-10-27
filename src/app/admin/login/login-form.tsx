"use client";

import { loginAction } from "@/app/admin/actions";
import { useFormAction } from "@/components/use-form-action";

export function LoginForm() {
  const [state, form, pending] = useFormAction(loginAction, { ok: false });

  return (
    <form {...form} className="mt-6 space-y-4">
      <div>
        <label htmlFor="login-email" className="field-label">
          Email
        </label>
        <input id="login-email" name="email" type="email" autoComplete="username" required className="field" />
      </div>
      <div>
        <label htmlFor="login-password" className="field-label">
          Password
        </label>
        <input id="login-password" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      {state.error && (
        <p role="alert" className="rounded-[3px] bg-clay-soft px-3 py-2.5 text-[13px] text-clay">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
