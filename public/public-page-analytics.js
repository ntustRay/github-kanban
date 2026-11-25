(() => {
  const measurementId = document.currentScript?.dataset.measurementId;
  if (
    !measurementId ||
    !/^G-[A-Z0-9]+$/.test(measurementId) ||
    location.origin !== "https://github-kanban-ntustray.vercel.app" ||
    !["/", "/demo", "/demo/"].includes(location.pathname) ||
    location.search ||
    location.hash ||
    /[?#]/.test(document.referrer) ||
    navigator.doNotTrack === "1" ||
    navigator.globalPrivacyControl === true
  ) {
    return;
  }

  const pagePath = location.pathname === "/" ? "/" : "/demo";
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  gtag("js", new Date());
  gtag("config", measurementId, {
    page_location: location.origin + pagePath,
    page_referrer: document.referrer ? new URL(document.referrer).origin : "",
    page_title: pagePath === "/" ? "GitHub Kanban" : "GitHub Kanban Demo",
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  const tag = document.createElement("script");
  tag.async = true;
  tag.referrerPolicy = "no-referrer";
  tag.src = "https://www.googletagmanager.com/gtag/js?id=" + measurementId;
  document.head.appendChild(tag);
})();
