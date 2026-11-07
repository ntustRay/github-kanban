import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "GitHub Kanban",
  description:
    "把 GitHub repos 整理成看板。讀文件、追進度、記備註，支援 AI Agent。",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
