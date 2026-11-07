import type { Card, Document } from "./model";
export const demoCards: Card[] = [
  ["1", "new-idea", "backlog", "把想法拆成可執行的第一步。", null],
  ["2", "personal-api", "backlog", "個人 API，等待需求確認。", "TypeScript"],
  ["3", "my-project", "in_progress", "實作核心功能與資料流程。", "TypeScript"],
  [
    "4",
    "chart-library",
    "in_progress",
    "Canvas 圖表與大型資料集。",
    "TypeScript",
  ],
  ["5", "design-system", "verify", "核心元件已完成，準備驗證。", "TypeScript"],
  ["6", "my-blog", "formal", "文章、筆記與開發紀錄。", "Astro"],
  ["7", "legacy-demo", "archive", "早期的練習專案。", "JavaScript"],
].map(([id, name, status, description, language]) => ({
  repoId: id ?? "",
  fullName: `demo/${name}`,
  name: name ?? "",
  description: description ?? null,
  url: "https://github.com",
  homepage: null,
  isPrivate: false,
  language: language ?? null,
  status:
    status === "in_progress"
      ? "in_progress"
      : status === "verify"
        ? "verify"
        : status === "formal"
          ? "formal"
          : status === "archive"
            ? "archive"
            : "backlog",
  notes: "",
  reason: "示範資料，可自由調整",
  source: "auto",
  position: Number(id),
  version: 0,
  pushedAt: "2026-11-07T00:00:00Z",
  updatedAt: "2026-11-07T00:00:00Z",
}));
export const demoDocuments: Document[] = [
  {
    name: "TODO.md",
    path: "TODO.md",
    content:
      "# Todo\n\n- [x] 建立專案\n- [x] 完成核心功能\n- [ ] 驗證操作流程\n- [ ] 更新文件\n",
    error: null,
  },
  {
    name: "README.md",
    path: "README.md",
    content:
      "# Demo repository\n\n這是看板示範文件。實際使用時會讀取你的 GitHub repository。\n\n## 開始使用\n\n```sh\nbun install\nbun dev\n```\n",
    error: null,
  },
  {
    name: "AGENTS.md",
    path: "AGENTS.md",
    content:
      "# Agent instructions\n\n1. 先閱讀 README.md 與 TODO.md。\n2. 透過看板 API 記錄進度與備註。\n3. 看板中的文件是唯讀的。\n",
    error: null,
  },
];
