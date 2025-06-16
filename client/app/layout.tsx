import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppSidebar from "@/components/AppSidebar";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cookies } from "next/headers";
import { Toaster } from "@/components/ui/toaster"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nextweb - Call Management System",
  description: "Batch calling and call history management system",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true"
 
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange>
             <SidebarProvider 
               defaultOpen={defaultOpen}
               style={
                 {
                   "--sidebar-width": "calc(var(--spacing) * 50)",
                   "--header-height": "calc(var(--spacing) * 12)",
                 } as React.CSSProperties
               }
             >
                <AppSidebar variant="inset" />
                <SidebarInset>
                  <Navbar />
                  <div className="flex flex-1 flex-col">
                    <div className="@container/main flex flex-1 flex-col">
                      <div>
                        {children}
                      </div>
                    </div>
                  </div>
                </SidebarInset>
            </SidebarProvider>
            <Toaster />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}