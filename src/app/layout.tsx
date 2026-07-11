import type { Metadata } from "next";
import { Inter, Space_Grotesk, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { TopNavBar } from "@/components/TopNavBar";
import { SideNavBar } from "@/components/SideNavBar";
import { BottomNavBar } from "@/components/BottomNavBar";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { SearchOverlay } from "@/components/SearchOverlay";
import { auth } from "@/auth";

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

  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${bricolageGrotesque.variable} antialiased min-h-screen flex flex-col md:flex-row overflow-x-hidden`}
      >
        <AuthSessionProvider session={session}>
          <SearchOverlay />
          <TopNavBar />
          <SideNavBar />
          {children}
          <BottomNavBar />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
