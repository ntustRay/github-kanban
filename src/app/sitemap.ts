import type { MetadataRoute } from "next";
import { demoUrl } from "@/lib/public-site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: demoUrl }];
}
