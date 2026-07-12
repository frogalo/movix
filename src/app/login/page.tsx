import { redirect } from "next/navigation";
import { auth, isGoogleAuthEnabled } from "@/auth";
import { AuthPanel } from "@/components/AuthPanel";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/profile");
  }

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 pb-28 pt-24 md:ml-64 md:w-[calc(100%-16rem)] md:px-12 md:pb-12 md:pt-12">
      <div className="absolute inset-0 opacity-70">
        <div className="absolute left-[-5%] top-[10%] h-72 w-72 rounded-full bg-[#571bc1] blur-[120px]" />
        <div className="absolute bottom-[5%] right-[10%] h-80 w-80 rounded-full bg-[#ffcc00] blur-[140px]" />
        <div className="absolute right-[20%] top-[20%] h-64 w-64 rounded-full bg-[#00daf3] blur-[130px]" />
      </div>
      <div className="relative z-10 w-full flex justify-center">
        <AuthPanel googleEnabled={isGoogleAuthEnabled} />
      </div>
    </main>
  );
}
