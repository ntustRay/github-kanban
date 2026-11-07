# GitHub Kanban

[開啟看板](https://github-kanban-ntustray.vercel.app/) · [試用示範](https://github-kanban-ntustray.vercel.app/demo) · [GitHub App](https://github.com/apps/mingray-repo-kanban)

以 GitHub repository 為卡片的個人看板。只用 GitHub 登入；原始碼、Issue 與 repo 文件維持唯讀。

## 功能

- `Backlog → In progress → Verify → Formal → Archive` 五欄看板。
- 列出 GitHub App 可存取的所有 repositories，包含分頁與授權的 private repos。
- 拖曳或下拉選單修改狀態，搜尋 repo、描述與備註，依語言和可見範圍篩選。
- 開啟卡片優先閱讀 `TODO.md`、`README.md`、`AGENTS.md`；搜尋根目錄、`docs/`、`.github/`，支援大小寫。
- 獨立儲存每人的狀態與備註；同步保留手動修改。
- Agent read / write token、90 天有效期、即時撤銷、OpenAPI、`llms.txt`、JSON 匯出。
- 版本衝突回傳 `409`，修改紀錄區分 human / agent。
- `/demo` 可試用，不會讀取或儲存真實 repo 資料。

## 本機開發

1. 安裝 Bun 1.4.4 與 Node.js 22+。
2. `bun install --frozen-lockfile`。
3. 複製 `.env.example` 為 `.env.local`，設定資料庫與 GitHub App credentials。
4. `bun run db:migrate` 建立 Better Auth 與看板資料表。
5. `bun dev`，開啟 `http://localhost:3000`。

```sh
bun run check
bun test
bun run build
```

## GitHub App

正式站使用 **MingRay Repo Kanban**，App slug 為 `mingray-repo-kanban`。GitHub 不允許 App 名稱以 GitHub 開頭；網站名稱維持 GitHub Kanban。

建立可供任何帳號安裝的 public GitHub App。設定：

| 項目                   | 值                                            |
| ---------------------- | --------------------------------------------- |
| Homepage URL           | 正式站網址                                    |
| Callback URL           | `https://你的正式站/api/auth/callback/github` |
| Setup URL              | 正式站網址                                    |
| Webhook                | 不啟用                                        |
| Repository permissions | Contents: Read-only；Metadata: Read-only      |
| Account permissions    | Email addresses: Read-only                    |
| Installation           | Any account                                   |

將 Client ID、Client secret 放到 `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`。設定 `NEXT_PUBLIC_GITHUB_APP_SLUG`。
每個使用者以自己的 GitHub 登入，並安裝 App。要列出所有 private repos，安裝時選 **All repositories**；組織可能需要管理員同意。
GitHub App 的權限不包含 repo 寫入。網站的 GitHub API client 只實作 GET。

## Neon / Vercel

1. Neon 建立專用 Postgres project。應用使用 pooled URL；migrations 使用 direct URL。
2. 設定 `DATABASE_URL`、`BETTER_AUTH_SECRET`（至少 32 隨機 bytes）、`BETTER_AUTH_URL`（正式站 origin），以及 GitHub App credentials。
3. 執行 migrations，再部署到 Vercel。`vercel.json` 在部署前執行 typecheck、unit tests 與 build。
4. `GET /api/health` 應回傳資料庫 ready、GitHub configured。
5. 測試登入、登出、重新整理、private repos、文件、備註與第二個帳號的隔離。

Production 與 Preview 使用不同 Neon branches。勿把 production credentials 放到不可信任的 PR build。

## 分類規則

| 訊號                      | 初始狀態    |
| ------------------------- | ----------- |
| GitHub archived           | Archive     |
| 空 repo / fork            | Backlog     |
| 最近 30 天有 push         | In progress |
| 較久未 push，但有網站連結 | Verify      |
| 其他                      | Backlog     |

Formal 需人確認。較久沒更新不能直接推定已封存。可在資料庫為特定 GitHub 帳號設定初始建議；設定只在新卡片第一次同步時使用。

## Agent API

登入後進入 **Agent access** 建立 token。只存 token hash，原始值只顯示一次。
完整規格：`/openapi.json`；操作摘要：`/llms.txt`。

```sh
export GKB_URL="https://你的正式站"
export GKB_TOKEN="在本機設定，不要 commit"
curl "$GKB_URL/api/board" -H "Authorization: Bearer $GKB_TOKEN"
```

```http
PATCH /api/board/123456
Authorization: Bearer <token>
Content-Type: application/json

{"status":"verify","notes":"Unit tests 通過，等待驗收","version":0}
```

遇到 `409` 重新讀取卡片並合併修改。Agent token 不能建立其他 token，不能修改 repo。

## 技術與資料

Next.js App Router、React、TypeScript、Bun、Biome、Better Auth、node-postgres、Neon、Vercel。
每筆看板資料以 `(user_id, repo_id)` 分開儲存。所有讀寫由 server 驗證使用者。
OAuth token 加密儲存；browser session cookie 為 HttpOnly；browser 寫入檢查同源。
不保存完整 repo 程式碼，文件按需從 GitHub 讀取。Markdown 不執行 HTML，不自動下載外部圖片。

## 驗證

- TypeScript、Biome、15 項 unit tests 與 Vercel build 通過。
- 獨立 Neon branch 驗證使用者資料隔離、token 權限與撤銷、版本衝突、修改紀錄及同步保留手動內容。
- 正式站驗證 GitHub 登入、登出、重新登入、public / private repos 同步及私人 README 預覽。
- 正式站驗證 TODO / README / AGENTS 預覽、狀態與備註儲存，重新登入後內容仍保留。

## 限制

- GitHub rate limit、撤銷授權或組織政策可能影響同步；介面會顯示錯誤。
- 首次同步依 repo 數量與 GitHub 回應速度而定；每人最多每分鐘同步一次。
- 只搜尋三個指定目錄，未遞迴搜尋整個 repository；超過 200 KB 的文件請在 GitHub 閱讀。
- 儲存狀態時會重新確認 GitHub 存取權限；多個人對同 repo 各有自己的個人看板。
