import { redirect } from "next/navigation";

// Performance data is admin-only. Public visitors are redirected to home.
export default function PerformancePage() {
  redirect("/");
}
