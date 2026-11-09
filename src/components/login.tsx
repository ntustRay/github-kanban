"use client";
import { ArrowRight, FileText, Kanban, Lock, Terminal } from "lucide-react";
import { AuthPanel } from "@ntustray/web-authentication-component/react";
import { ThemeToggle } from "./theme-toggle";
export function Login({
  configured,
  failed = false,
}: {
  configured: boolean;
  failed?: boolean;
}) {
  return (
    <main className="login-page">
      <header className="login-header">
        <a className="brand" href="/">
          <Kanban size={23} />
          <span>GitHub Kanban</span>
        </a>
        <div className="login-actions">
          <ThemeToggle />
          <a href="/demo">
            先試用看板 <ArrowRight size={16} />
          </a>
        </div>
      </header>
      <section className="login-content">
        <div className="login-copy">
          <span className="workspace-label">
            <span className="blue-dot" />
            你的 repo 工作台
          </span>
          <h1>
            下一個進度，
            <br />
            從這裡開始。
          </h1>
          <p>
            把散落的 repositories 放進同一張看板。
            <br />
            看文件、記備註，和你的 AI Agent 一起推進。
          </p>
          <AuthPanel disabled={!configured} notice={failed ? { tone: "error", message: "GitHub 登入未完成，請重新嘗試。" } : undefined} />
          <p className="small">只支援 GitHub 帳號。Repo 內容唯讀。</p>
          {!configured ? (
            <p role="status" className="notice">
              GitHub 登入設定中。可以先試用看板。
            </p>
          ) : null}
          <div className="login-features">
            <span>
              <FileText size={16} />
              文件在前，進度在旁
            </span>
            <span>
              <Lock size={16} />
              備註與 repo 分開儲存
            </span>
            <span>
              <Terminal size={16} />
              Agent 可透過 API 協作
            </span>
          </div>
        </div>
        <div className="board-preview" role="img" aria-label="看板預覽">
          <div className="preview-title">
            <Kanban size={18} /> My workspace <span>Repositories</span>
          </div>
          <div className="preview-columns">
            {[
              {
                title: "Backlog",
                name: "new-idea",
                tag: "規劃下一步",
                color: "gray",
              },
              {
                title: "In progress",
                name: "my-project",
                tag: "完成核心功能",
                color: "blue",
              },
              {
                title: "Verify",
                name: "design-system",
                tag: "驗證互動與文件",
                color: "orange",
              },
            ].map((col) => (
              <section key={col.title}>
                <h2>
                  <i className={col.color} />
                  {col.title}
                  <span>1</span>
                </h2>
                <div className="preview-card">
                  <span className="repo-label">Repository</span>
                  <h3>{col.name}</h3>
                  <p>{col.tag}</p>
                  <div className="preview-lines" />
                  <span className="preview-lang">● TypeScript</span>
                </div>
                <div className="preview-placeholder" />
              </section>
            ))}
          </div>
          <div className="preview-footer">
            <span className="blue-dot" />
            GitHub 唯讀 · 看板可編輯
          </div>
        </div>
      </section>
      <footer className="login-footer">
        GitHub Kanban <span>你的工作進度，由你決定。</span>
        <a
          href="https://github.com/ntustRay/github-kanban"
          target="_blank"
          rel="noreferrer"
        >
          Source on GitHub
        </a>
      </footer>
    </main>
  );
}
