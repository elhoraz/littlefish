import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "ADMIN") {
    redirect("/admin/dashboard");
  } else if (user.role === "TUTOR") {
    redirect("/tutor/dashboard");
  } else {
    redirect("/parent/dashboard");
  }
}
