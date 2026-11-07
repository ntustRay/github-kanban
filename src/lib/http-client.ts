import { z } from "zod";
export async function jsonRequest(
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data: unknown = await response.json();
  if (!response.ok) {
    const err = z.object({ error: z.string() }).safeParse(data);
    throw new Error(err.success ? err.data.error : "請求失敗，請稍後重試。");
  }
  return data;
}
