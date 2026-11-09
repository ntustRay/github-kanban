"use client";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  Kanban,
  LayoutGrid,
  Lock,
  LogOut,
  RefreshCw,
  Search,
  Terminal,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { SignOutButton } from "@ntustray/web-authentication-component/react";
import { demoCards } from "@/lib/demo";
import { jsonRequest } from "@/lib/http-client";
import { type Card, type Status, statuses } from "@/lib/model";
import { AgentPanel } from "./agent-panel";
import { Detail } from "./detail";
import { Github } from "./github-icon";
import { KanbanBoard } from "./kanban-board";
import { ThemeToggle } from "./theme-toggle";

const cardSchema = z.object({
  repoId: z.string(),
  fullName: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  url: z.string(),
  homepage: z.string().nullable(),
  isPrivate: z.boolean(),
  language: z.string().nullable(),
  status: z.enum(statuses),
  notes: z.string(),
  reason: z.string(),
  source: z.enum(["auto", "manual"]),
  position: z.number(),
  version: z.number(),
  pushedAt: z.string().nullable(),
  updatedAt: z.string(),
});
export function Workspace({
  user,
  demo = false,
}: {
  user: { name: string; image: string | null };
  demo?: boolean;
}) {
  const [cards, setCards] = useState<Card[]>(demo ? demoCards : []);
  const [loading, setLoading] = useState(!demo);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState("all");
  const [language, setLanguage] = useState("all");
  const [view, setView] = useState<"board" | "agents">("board");
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const pendingRef = useRef(new Set<string>());
  const started = useRef(false);
  const [lastSync, setLastSync] = useState("");
  const selectedCard = cards.find((c) => c.repoId === selected) ?? null;
  useEffect(() => {
    if (demo || started.current) return;
    started.current = true;
    void (async () => {
      try {
        const data = z
          .object({ cards: z.array(cardSchema) })
          .parse(await jsonRequest("/api/board"));
        setCards(data.cards);
        if (data.cards.length === 0) {
          setSyncing(true);
          const synced = z
            .object({ cards: z.array(cardSchema) })
            .parse(await jsonRequest("/api/board", { method: "POST" }));
          setCards(synced.cards);
          setLastSync(
            new Date().toLocaleTimeString("zh-TW", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          );
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "無法載入看板");
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    })();
  }, [demo]);
  async function sync() {
    setSyncing(true);
    setError("");
    try {
      if (demo) {
        setMessage("這是示範看板；登入後會同步你的 repositories。");
        return;
      }
      const data = z
        .object({ cards: z.array(cardSchema) })
        .parse(await jsonRequest("/api/board", { method: "POST" }));
      setCards(data.cards);
      setMessage(`已同步 ${data.cards.length} 個 repositories`);
      setLastSync(
        new Date().toLocaleTimeString("zh-TW", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "同步失敗");
    } finally {
      setSyncing(false);
    }
  }
  async function save(
    card: Card,
    changes: { status?: Status; notes?: string; position?: number },
  ) {
    if (pendingRef.current.has(card.repoId))
      throw new Error("此卡片仍在儲存中");
    pendingRef.current.add(card.repoId);
    setPending(new Set(pendingRef.current));
    setError("");
    const optimistic: Card = {
      ...card,
      ...changes,
      source: "manual",
      reason: "手動設定",
    };
    setCards((prev) =>
      prev.map((item) => (item.repoId === card.repoId ? optimistic : item)),
    );
    try {
      let updated: Card;
      if (demo) {
        updated = {
          ...card,
          ...changes,
          version: card.version + 1,
          source: "manual",
          reason: "手動設定",
          updatedAt: new Date().toISOString(),
        };
      } else {
        updated = z.object({ card: cardSchema }).parse(
          await jsonRequest(`/api/board/${card.repoId}`, {
            method: "PATCH",
            body: JSON.stringify({ ...changes, version: card.version }),
          }),
        ).card;
      }
      setCards((prev) =>
        prev.map((c) => (c.repoId === updated.repoId ? updated : c)),
      );
      setMessage(`已儲存 ${updated.name}`);
      return updated;
    } catch (e) {
      setCards((prev) =>
        prev.map((item) => (item.repoId === card.repoId ? card : item)),
      );
      const msg = e instanceof Error ? e.message : "儲存失敗";
      setError(msg);
      throw e;
    } finally {
      pendingRef.current.delete(card.repoId);
      setPending(new Set(pendingRef.current));
    }
  }
  const filtered = cards.filter(
    (c) =>
      `${c.fullName} ${c.description ?? ""} ${c.notes}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (visibility === "all" ||
        (visibility === "private" ? c.isPrivate : !c.isPrivate)) &&
      (language === "all" || c.language === language),
  );
  function exportBoard() {
    const blob = new Blob(
      [JSON.stringify({ statuses, cards: filtered }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "github-kanban.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="workspace">
      <aside className="sidebar">
        <a className="brand" href="/">
          <Kanban size={23} />
          <span>GitHub Kanban</span>
        </a>
        <div className="workspace-account">
          <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{user.name}</strong>
            <span>Personal workspace</span>
          </div>
        </div>
        <nav aria-label="主要導覽">
          <button
            type="button"
            className={view === "board" ? "nav-item active" : "nav-item"}
            onClick={() => setView("board")}
          >
            <LayoutGrid size={18} />
            Repositories<span>{cards.length}</span>
          </button>
          <button
            type="button"
            className={view === "agents" ? "nav-item active" : "nav-item"}
            onClick={() => setView("agents")}
          >
            <Terminal size={18} />
            Agent access
          </button>
        </nav>
        <div className="sidebar-note">
          <Lock size={17} />
          <strong>Repo 內容唯讀</strong>
          <p>
            狀態與備註獨立儲存。
            <br />
            不會 commit 或修改文件。
          </p>
        </div>
        <div className="sidebar-bottom">
          <a
            href="https://github.com/ntustRay/github-kanban#readme"
            target="_blank"
            rel="noreferrer"
          >
            <BookOpen size={16} />
            使用說明
            <ExternalLink size={13} />
          </a>
          {demo ? (
            <a href="/">
              <ArrowLeft size={16} />
              登入自己的 GitHub
            </a>
          ) : (
            <SignOutButton>
              <LogOut size={16} />
              登出
            </SignOutButton>
          )}
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <span>Workspace</span>
            <ChevronDown size={14} />
            <strong>
              {view === "board" ? "Repositories" : "Agent access"}
            </strong>
          </div>
          <div className="topbar-actions">
            <ThemeToggle />
            <span className="account-chip">
              <Github size={16} />
              {user.name}
            </span>
          </div>
        </header>
        {demo ? (
          <div className="demo-banner">
            示範模式：可以移動卡片、修改備註；重新整理後還原。
            <a href="/">
              使用 GitHub 登入 <ArrowLeft size={14} />
            </a>
          </div>
        ) : null}
        {view === "agents" ? (
          <AgentPanel demo={demo} />
        ) : (
          <>
            <section className="board-heading">
              <div>
                <h1>
                  Repositories <span>{cards.length}</span>
                </h1>
                <p>從想法到正式使用，每個 repo 都有下一步。</p>
              </div>
              <div className="heading-actions">
                {lastSync ? (
                  <span className="sync-time">同步於 {lastSync}</span>
                ) : null}
                <button
                  type="button"
                  className="secondary"
                  onClick={exportBoard}
                  disabled={loading}
                >
                  <FileText size={16} />
                  匯出 JSON
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={sync}
                  disabled={syncing || loading || pending.size > 0}
                >
                  <span className={syncing ? "spin icon-wrap" : "icon-wrap"}>
                    <RefreshCw size={16} />
                  </span>
                  {syncing ? "同步中…" : "同步 GitHub"}
                </button>
              </div>
            </section>
            <section className="toolbar" aria-label="篩選 repositories">
              <label className="search">
                <Search size={17} />
                <input
                  placeholder="搜尋 repo、描述或備註…"
                  aria-label="搜尋 repositories"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search ? (
                  <button
                    type="button"
                    aria-label="清除搜尋"
                    onClick={() => setSearch("")}
                  >
                    ×
                  </button>
                ) : null}
              </label>
              <select
                aria-label="可見範圍"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
              >
                <option value="all">全部 repo</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
              <select
                aria-label="程式語言"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="all">所有語言</option>
                {[
                  ...new Set(
                    cards.flatMap((c) => (c.language ? [c.language] : [])),
                  ),
                ]
                  .sort()
                  .map((lang) => (
                    <option key={lang}>{lang}</option>
                  ))}
              </select>
              <span className="toolbar-hint">拖曳卡片，或使用狀態選單</span>
            </section>
            {error ? (
              <div className="error-banner" role="alert">
                {error}
                <button type="button" onClick={() => location.reload()}>
                  重新載入
                </button>
              </div>
            ) : null}
            <p className="sr-only" role="status" aria-live="polite">
              {message}
            </p>
            {message ? (
              <div className="save-status">
                <Check size={14} />
                {message}
                <button
                  type="button"
                  aria-label="關閉提示"
                  onClick={() => setMessage("")}
                >
                  ×
                </button>
              </div>
            ) : null}
            {loading ? (
              <div className="loading-board" role="status">
                <span className="spin">
                  <RefreshCw size={24} />
                </span>
                <strong>正在整理 repositories…</strong>
                <p>第一次同步需要讀取 GitHub repo 清單。</p>
              </div>
            ) : (
              <>
                <KanbanBoard
                  cards={cards}
                  visibleIds={new Set(filtered.map((card) => card.repoId))}
                  pending={pending}
                  disabled={syncing}
                  onOpen={setSelected}
                  onSave={save}
                />
                <footer className="board-footer">
                  <span>
                    {filtered.length} / {cards.length} repositories
                  </span>
                  <span>自動分類只是建議；Formal 由你確認。</span>
                  {!demo && process.env.NEXT_PUBLIC_GITHUB_APP_SLUG ? (
                    <a
                      href={`https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_SLUG}/installations/new`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      管理 repo 授權 <ExternalLink size={12} />
                    </a>
                  ) : null}
                </footer>
                {cards.length === 0 ? (
                  <div className="empty-help">
                    <h2>尚未讀到 repositories</h2>
                    <p>
                      請先安裝 GitHub App，選擇 All repositories，再按同步。
                    </p>
                    {process.env.NEXT_PUBLIC_GITHUB_APP_SLUG ? (
                      <a
                        className="primary"
                        href={`https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_SLUG}/installations/new`}
                      >
                        連接 repositories
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </>
        )}
      </main>
      {selectedCard ? (
        <Detail
          key={selectedCard.repoId}
          card={selectedCard}
          demo={demo}
          saving={pending.has(selectedCard.repoId)}
          onClose={() => setSelected(null)}
          onSave={(changes) => save(selectedCard, changes)}
        />
      ) : null}
    </div>
  );
}
