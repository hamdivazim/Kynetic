import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AwsProvider, EditorProvider, PreviewProvider } from "@/lib/state";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kynetic Editor",
  description: "Create whiteboard-style animation projects for the Kynetic renderer. Built by Hamd Waseem.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AwsProvider>
          <EditorProvider>
            <PreviewProvider>{children}</PreviewProvider>
          </EditorProvider>
        </AwsProvider>
      </body>
    </html>
  );
}
