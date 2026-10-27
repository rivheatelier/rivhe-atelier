import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-switch";
import { Wordmark } from "@/components/wordmark";
import { getAdminUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLoginPage() {
  if (await getAdminUser()) redirect("/admin");

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-5 py-12">
      <ThemeToggle className="absolute top-3 right-3 text-ink-2" />
      <Wordmark size="lg" />
      <div className="mt-10 w-full max-w-sm rounded-[4px] border border-line bg-surface p-6 sm:p-7">
        <h1 className="font-serif text-[26px] leading-tight">Admin sign in</h1>
        <p className="mt-1 text-[13px] text-muted">Manage pieces, orders and payments.</p>
        <LoginForm />
      </div>
      <p className="mt-6 max-w-sm text-center text-[12px] leading-relaxed text-muted">
        Forgot your password? contact the site administrator to reset it.
      </p>
    </div>
  );
}
