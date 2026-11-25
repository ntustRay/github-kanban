import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const script = readFileSync(
  new URL("../public/public-page-analytics.js", import.meta.url),
  "utf8",
);
const production = "https://github-kanban-ntustray.vercel.app";

function visit(url: string, doNotTrack = "0") {
  const dataLayer: unknown[][] = [];
  const tags: { src: string }[] = [];
  runInNewContext(script, {
    document: {
      currentScript: { dataset: { measurementId: "G-EXAMPLE123" } },
      createElement: () => ({}),
      head: { appendChild: (tag: { src: string }) => tags.push(tag) },
    },
    location: new URL(url),
    navigator: { doNotTrack },
    window: { dataLayer },
  });
  return { dataLayer, tags };
}

test("sends one public page view without query, fragment, or referrer", () => {
  const { dataLayer, tags } = visit(production + "/demo?token=private#note");
  expect(tags).toHaveLength(1);
  expect(dataLayer).toHaveLength(2);
  expect(Array.from(dataLayer[1])).toEqual([
    "config",
    "G-EXAMPLE123",
    {
      page_location: production + "/demo",
      page_referrer: "",
      page_title: "GitHub Kanban Demo",
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    },
  ]);
});

test("skips previews, private paths and Do Not Track", () => {
  expect(visit("https://preview.vercel.app/demo").tags).toHaveLength(0);
  expect(visit(production + "/api/auth/callback/github").tags).toHaveLength(0);
  expect(visit(production + "/demo", "1").tags).toHaveLength(0);
});
