import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    if (user.role === "TUTOR") redirect("/tutor/dashboard");
    if (user.role === "PARENT") redirect("/parent/dashboard");
    redirect("/login");
  }

  return <AppShell user={user}>{children}</AppShell>;
}
