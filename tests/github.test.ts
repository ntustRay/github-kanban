import { afterEach, describe, expect, test } from "bun:test";
import { documents, githubGet, listRepositories } from "../src/lib/github";
import type { Repository } from "../src/lib/model";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const fixture: Repository = {
  id: 1,
  name: "example",
  full_name: "demo/example",
  owner: { login: "demo" },
  description: null,
  html_url: "https://github.com/demo/example",
  homepage: null,
  private: true,
  archived: false,
  fork: false,
  size: 100,
  default_branch: "main",
  language: "TypeScript",
  pushed_at: null,
  updated_at: "2026-11-01T00:00:00Z",
  open_issues_count: 0,
};
function mockFetch(
  handler: (url: string, init: RequestInit | undefined) => Response,
) {
  globalThis.fetch = Object.assign(
    async (input: Parameters<typeof fetch>[0], init?: RequestInit) =>
      handler(String(input), init),
    { preconnect: originalFetch.preconnect },
  );
}
describe("GitHub read boundary", () => {
  test("uses GET and sends bearer token only to GitHub", async () => {
    mockFetch((url, init) => {
      expect(url).toBe("https://api.github.com/user");
      expect(init?.method).toBe("GET");
      expect(new Headers(init?.headers).get("authorization")).toBe(
        "Bearer fixture",
      );
      return Response.json({ ok: true });
    });
    await githubGet("/user", "fixture");
  });
  test("rejects URL injection", async () => {
    await expect(githubGet("https://evil.test", "fixture")).rejects.toThrow();
    await expect(githubGet("//evil.test", "fixture")).rejects.toThrow();
  });
  test("fetches beyond first 100 repositories", async () => {
    let count = 0;
    mockFetch((url) => {
      count++;
      return Response.json(
        url.includes("page=1&")
          ? Array.from({ length: 100 }, (_, i) => ({ ...fixture, id: i + 1 }))
          : [{ ...fixture, id: 101 }],
      );
    });
    expect((await listRepositories("fixture")).length).toBe(101);
    expect(count).toBe(2);
  });
  test("finds filenames without case sensitivity in priority order", async () => {
    mockFetch((url) =>
      url.endsWith("/contents")
        ? Response.json([
            { name: "todo.md", path: "todo.md", type: "file", size: 20 },
            { name: "Readme.md", path: "Readme.md", type: "file", size: 20 },
          ])
        : Response.json({
            encoding: "base64",
            content: Buffer.from("# fixture").toString("base64"),
          }),
    );
    const docs = await documents(fixture, "fixture");
    expect(docs.map((d) => d.name)).toEqual([
      "TODO.md",
      "README.md",
      "AGENTS.md",
    ]);
    expect(docs[0].content).toBe("# fixture");
    expect(docs[2].content).toBeNull();
  });
  test("missing root is represented explicitly", async () => {
    mockFetch(() => Response.json({ message: "empty" }, { status: 404 }));
    const docs = await documents(fixture, "fixture");
    expect(docs.every((d) => d.content === null && d.error)).toBe(true);
  });
});
