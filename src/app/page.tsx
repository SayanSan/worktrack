import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/current-user";

export default async function Home() {
  const profile = await getCurrentProfile();
  redirect(profile ? "/dashboard" : "/login");
}
