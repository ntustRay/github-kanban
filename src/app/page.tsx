import { headers } from "next/headers";
import { Login } from "@/components/login";
import { Workspace } from "@/components/workspace";
import { auth } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ auth_error?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  return session ? (
    <Workspace
      user={{ name: session.user.name, image: session.user.image ?? null }}
    />
  ) : (
    <Login
      configured={Boolean(process.env.GITHUB_CLIENT_ID)}
      failed={Boolean((await searchParams).auth_error)}
    />
  );
}
