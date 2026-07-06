import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Querion — AI SQL Query Optimizer",
  description: "Production-ready PostgreSQL EXPLAIN plan visualizer and AI query tuner powered by Gemini 1.5 Flash.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
