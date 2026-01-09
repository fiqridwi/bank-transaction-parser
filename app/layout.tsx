import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bank Transaction Converter",
  description: "Convert bank transaction PDF statements to Excel format",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
