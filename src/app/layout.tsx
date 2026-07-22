import type { Metadata } from "next";
import { Inter, Space_Grotesk, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { TopNavBar } from "@/components/navigation/TopNavBar";
import { SideNavBar } from "@/components/navigation/SideNavBar";
import { BottomNavBar } from "@/components/navigation/BottomNavBar";
import { AuthSessionProvider } from "@/components/auth/AuthSessionProvider";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-bricolage-grotesque",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "movix",
  description: "The best movie application",
  icons: {
    icon: [
      { url: "/favicons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicons/favicon.ico" },
    ],
    apple: [
      { url: "/favicons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/favicons/site.webmanifest",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover' as const,
  themeColor: '#131318',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  let showVerificationBanner = false;
  let userEmail = "";
  let userName = "";

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true, email: true, name: true },
    });
    if (user && !user.emailVerified) {
      const isGmail = user.email.toLowerCase().endsWith("@gmail.com");
      if (!isGmail) {
        showVerificationBanner = true;
        userEmail = user.email;
        userName = user.name ?? "there";
      }
    }
  }

  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Edu+VIC+WA+NT+Hand:wght@400..700&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${bricolageGrotesque.variable} antialiased min-h-screen flex flex-col md:flex-row overflow-x-hidden`}
      >
        <AuthSessionProvider session={session}>
          <SearchOverlay />
          <TopNavBar />
          <SideNavBar />
          <div className="flex flex-col w-full min-h-screen">
            {showVerificationBanner && session?.user?.id && (
              <EmailVerificationBanner
                userId={session.user.id}
                email={userEmail}
                name={userName}
              />
            )}
            {children}
          </div>
          <BottomNavBar />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
