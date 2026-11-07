"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="page-loading">
      <h1>暫時無法載入</h1>
      <p>請稍後重試；你的狀態與備註仍保留在看板。</p>
      <button type="button" className="primary" onClick={reset}>
        重新嘗試
      </button>
    </main>
  );
}
