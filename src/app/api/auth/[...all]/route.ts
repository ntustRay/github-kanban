import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

const handlers = toNextJsHandler(auth);
const allowed = new Set([
  "sign-in/social",
  "callback/github",
  "get-session",
  "sign-out",
  "ok",
  "error",
]);
function permitted(request: Request) {
  return allowed.has(
    new URL(request.url).pathname.replace(/^\/api\/auth\//, ""),
  );
}
export async function GET(request: Request) {
  if (!permitted(request))
    return Response.json({ error: "Not found" }, { status: 404 });
  return handlers.GET(request);
}
export async function POST(request: Request) {
  if (!permitted(request))
    return Response.json({ error: "Not found" }, { status: 404 });
  return handlers.POST(request);
}
