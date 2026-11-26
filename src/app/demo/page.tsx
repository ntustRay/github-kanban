import type { Metadata } from "next";
import { PublicAnalytics } from "@/components/public-analytics";
import { Workspace } from "@/components/workspace";
import { demoDescription, demoUrl, siteName } from "@/lib/public-site";

const image = {
  url: "https://ntustray.github.io/mr-blog/images/projects/kanban.webp",
  width: 880,
  height: 516,
  alt: "GitHub Kanban 公開看板所使用的藍色三欄圖示。",
};

export const metadata: Metadata = {
  description: demoDescription,
  alternates: { canonical: demoUrl },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    title: siteName,
    description: demoDescription,
    url: demoUrl,
    images: [image],
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: demoDescription,
    images: [image],
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "@id": "https://ntustray.github.io/mr-blog/projects/kanban/#product",
  name: siteName,
  description: demoDescription,
  url: demoUrl,
  image: image.url,
  inLanguage: "zh-Hant",
  subjectOf: { "@id": "https://ntustray.github.io/mr-blog/series/kanban/" },
};

export default function Demo() {
  return (
    <>
      <script type="application/ld+json">
        {JSON.stringify(structuredData).replaceAll("<", "\\u003c")}
      </script>
      <PublicAnalytics />
      <Workspace user={{ name: "Demo workspace", image: null }} demo />
    </>
  );
}
