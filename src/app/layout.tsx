import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Crafter Chat - Private P2P Messaging",
  description:
    "Secure peer-to-peer chat. Your messages go directly to your peer, never through our servers. No accounts, no tracking, just private conversations.",
  keywords: ["chat", "p2p", "private", "secure", "webrtc", "encrypted"],
  authors: [{ name: "Crafter Chat" }],
  openGraph: {
    title: "Crafter Chat - Private P2P Messaging",
    description:
      "Secure peer-to-peer chat. Your messages never touch our servers.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
