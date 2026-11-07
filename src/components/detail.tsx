"use client";
import {
  Check,
  ExternalLink,
  FileText,
  Lock,
  RefreshCw,
  Save,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { z } from "zod";
import { demoDocuments } from "@/lib/demo";
import { jsonRequest } from "@/lib/http-client";
import {
  type Card,
  type Document,
  labels,
  type Status,
  statuses,
} from "@/lib/model";

const documentSchema = z.object({
  name: z.string(),
  path: z.string().nullable(),
  content: z.string().nullable(),
  error: z.string().nullable(),
});
export function Detail({
  card,
  demo,
  saving,
  onClose,
  onSave,
}: {
  card: Card;
  demo: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (changes: {
    status?: Status;
    notes?: string;
  }) => Promise<Card | undefined>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [documents, setDocuments] = useState<Document[]>(
    demo ? demoDocuments : [],
  );
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("TODO.md");
  const [notes, setNotes] = useState(card.notes);
  const [status, setStatus] = useState<Status>(card.status);
  const [saved, setSaved] = useState(false);
  const [retry, setRetry] = useState(0);
  const dirty = notes !== card.notes || status !== card.status;
  function close() {
    if (!saving && (!dirty || window.confirm("尚有未儲存的修改，確定關閉？")))
      onClose();
  }
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  useEffect(() => {
    if (demo) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void jsonRequest(`/api/board/${card.repoId}/documents?refresh=${retry}`, {
      signal: controller.signal,
    })
      .then((data) => {
        const docs = z
          .object({ documents: z.array(documentSchema) })
          .parse(data).documents;
        setDocuments(docs);
        const first = docs.find((d) => d.content !== null);
        if (first) setTab(first.name);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "無法讀取文件");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [card.repoId, demo, retry]);
  const active = documents.find((d) => d.name === tab);
  async function save() {
    setSaved(false);
    setError("");
    try {
      await onSave({ status, notes });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "儲存失敗");
    }
  }
  return (
    <dialog
      className="detail-dialog"
      ref={dialog}
      aria-labelledby="detail-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="detail-top">
        <div>
          <span className="card-owner">
            {card.fullName}
            {card.isPrivate ? <Lock size={13} /> : null}
          </span>
          <h1 id="detail-title">{card.name}</h1>
          <p>{card.description}</p>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="關閉卡片"
          onClick={close}
          disabled={saving}
        >
          <X size={21} />
        </button>
      </div>
      <div className="detail-links">
        <a href={card.url} target="_blank" rel="noreferrer">
          GitHub <ExternalLink size={13} />
        </a>
        {card.homepage && /^https?:\/\//.test(card.homepage) ? (
          <a href={card.homepage} target="_blank" rel="noreferrer">
            專案網站 <ExternalLink size={13} />
          </a>
        ) : null}
        <span>
          <Lock size={12} /> Repo 文件唯讀
        </span>
      </div>
      <div className="detail-body">
        <section className="documents">
          <div className="section-heading">
            <h2>
              <FileText size={17} />
              Repo 文件
            </h2>
            <button
              type="button"
              className="text-button"
              onClick={() => setRetry((n) => n + 1)}
              disabled={loading || demo}
            >
              重新讀取
            </button>
          </div>
          <div className="document-tabs" role="tablist" aria-label="Repo 文件">
            {["TODO.md", "README.md", "AGENTS.md"].map((name) => (
              <button
                type="button"
                key={name}
                role="tab"
                id={`tab-${name}`}
                aria-selected={tab === name}
                aria-controls="document-panel"
                onClick={() => setTab(name)}
              >
                {name}
                {documents.find((d) => d.name === name)?.content !== null &&
                documents.length > 0 ? (
                  <span className="blue-dot" />
                ) : null}
              </button>
            ))}
          </div>
          <div
            className="document-content"
            id="document-panel"
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
          >
            {loading ? (
              <div className="document-loading" role="status">
                <span className="spin">
                  <RefreshCw size={19} />
                </span>
                正在讀取文件…
              </div>
            ) : active?.content !== null && active?.content !== undefined ? (
              <>
                <div className="document-path">{active.path}</div>
                <div className="markdown">
                  <Markdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      img: ({ alt }) => (
                        <span className="image-placeholder">
                          [圖片：{alt || "至 GitHub 檢視"}]
                        </span>
                      ),
                      a: ({ href, children }) => (
                        <a
                          href={href?.startsWith("https://") ? href : card.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {active.content}
                  </Markdown>
                </div>
              </>
            ) : (
              <div className="document-missing">
                <FileText size={25} />
                <strong>{active?.error ?? "找不到此文件"}</strong>
                <p>搜尋 repo 根目錄、docs 與 .github，支援檔名大小寫。</p>
                <a href={card.url} target="_blank" rel="noreferrer">
                  在 GitHub 檢查 <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>
        </section>
        <aside className="detail-notes">
          <h2>看板備註</h2>
          <label htmlFor="repo-status">狀態</label>
          <select
            id="repo-status"
            value={status}
            disabled={saving}
            onChange={(e) => {
              const next = statuses.find((s) => s === e.target.value);
              if (next) setStatus(next);
              setSaved(false);
            }}
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {labels[s]}
              </option>
            ))}
          </select>
          <p className="classification">{card.reason}</p>
          <label htmlFor="repo-notes">備註</label>
          <textarea
            id="repo-notes"
            rows={12}
            maxLength={20000}
            value={notes}
            disabled={saving}
            onChange={(e) => {
              setNotes(e.target.value);
              setSaved(false);
            }}
            placeholder="記下下一步、驗證結果，或給 Agent 的交接事項…"
          />
          <div className="notes-meta">
            <span>支援純文字與 Markdown</span>
            <span>{notes.length}/20000</span>
          </div>
          <p className="small">這些修改只儲存於看板，不會更動 repo。</p>
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            className="primary"
            disabled={saving || !dirty}
            onClick={save}
          >
            {saving ? (
              <span className="spin">
                <RefreshCw size={16} />
              </span>
            ) : (
              <Save size={16} />
            )}{" "}
            {saving ? "儲存中…" : "儲存修改"}
          </button>
          {saved ? (
            <p className="saved" role="status">
              <Check size={14} />
              已儲存
            </p>
          ) : null}
          <span className="version">
            版本 {card.version} ·{" "}
            {new Date(card.updatedAt).toLocaleDateString("zh-TW")}
          </span>
        </aside>
      </div>
    </dialog>
  );
}
