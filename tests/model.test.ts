import { describe, expect, test } from "bun:test";
import { classify, editSchema, type Repository } from "../src/lib/model";

const repo: Repository = {
  id: 1,
  name: "example",
  full_name: "demo/example",
  owner: { login: "demo" },
  description: null,
  html_url: "https://github.com/demo/example",
  homepage: null,
  private: false,
  archived: false,
  fork: false,
  size: 100,
  default_branch: "main",
  language: "TypeScript",
  pushed_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
  open_issues_count: 0,
};
const now = Date.parse("2026-11-07T00:00:00Z");
describe("initial classification", () => {
  test("archived wins over recent activity", () =>
    expect(classify({ ...repo, archived: true }, now).status).toBe("archive"));
  test("empty repositories remain backlog", () =>
    expect(classify({ ...repo, size: 0 }, now).status).toBe("backlog"));
  test("forks are not assumed to be active projects", () =>
    expect(classify({ ...repo, fork: true }, now).status).toBe("backlog"));
  test("recent commits indicate in progress", () =>
    expect(classify(repo, now).status).toBe("in_progress"));
  test("homepage does not imply production-ready", () =>
    expect(
      classify(
        {
          ...repo,
          pushed_at: "2025-01-01T00:00:00Z",
          homepage: "https://example.com",
        },
        now,
      ).status,
    ).toBe("verify"));
  test("no activity signals do not imply archive", () =>
    expect(classify({ ...repo, pushed_at: null }, now).status).toBe("backlog"));
});
describe("write contract", () => {
  test("requires current version", () =>
    expect(editSchema.safeParse({ status: "verify" }).success).toBe(false));
  test("rejects user and repository ownership overrides", () =>
    expect(
      editSchema.safeParse({ status: "verify", version: 0, userId: "other" })
        .success,
    ).toBe(false));
  test("rejects unknown status and empty mutations", () => {
    expect(editSchema.safeParse({ status: "done", version: 0 }).success).toBe(
      false,
    );
    expect(editSchema.safeParse({ version: 0 }).success).toBe(false);
  });
  test("permits clearing notes and bounds content", () => {
    expect(editSchema.safeParse({ notes: "", version: 1 }).success).toBe(true);
    expect(
      editSchema.safeParse({ notes: "x".repeat(20001), version: 1 }).success,
    ).toBe(false);
  });
});
