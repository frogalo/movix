import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { HomeClient } from "@/components/home/HomeClient";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/library");
  }

  return <HomeClient />;
}
