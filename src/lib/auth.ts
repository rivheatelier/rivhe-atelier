import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/admin-emails";
import { createAuthClient } from "@/lib/supabase/server";

export { adminEmails, isAdminEmail } from "@/lib/admin-emails";

export type AdminUser = { id: string; email: string };

export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email || !isAdminEmail(data.user.email)) return null;
  return { id: data.user.id, email: data.user.email };
});

/**
 * Call at the top of every admin page and Server Action. A check in the admin layout
 * alone isn't enough: layouts aren't re-rendered on every navigation.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return user;
}
