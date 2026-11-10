import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Frontier — 每日AI前沿速览",
  description: "每日精选全球AI前沿：GitHub热项、顶尖研究、行业动态、大佬观点。自动聚合更新，无广告。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
