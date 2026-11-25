import Script from "next/script";

export function PublicAnalytics() {
  const id = process.env.GA_MEASUREMENT_ID;
  if (process.env.VERCEL_ENV !== "production" || !id || !/^G-[A-Z0-9]+$/.test(id)) {
    return null;
  }

  return (
    <Script
      id="public-page-analytics"
      src="/public-page-analytics.js"
      data-measurement-id={id}
      strategy="afterInteractive"
    />
  );
}
