import { defineToolbarApp } from "astro/toolbar";

import type { CompassFindingLevel } from "../libs/rule";
import type {
  ToolbarResultPayload,
  ToolbarReviewPayload,
} from "../libs/toolbar";

// Duplicated from `libs/toolbar.ts` as this module runs in the browser and cannot import Node.js code.
const TOOLBAR_REVIEW_EVENT = "starlight-compass:review";
const TOOLBAR_RESULT_EVENT = "starlight-compass:result";

const DOCS_URL = "https://starlight-compass.netlify.app/concepts/how-it-works/";
const INLINE_CODE_RE = /`([^`]+)`/g;

const LEVEL_BADGE_STYLES = {
  error: "red",
  info: "blue",
  warning: "yellow",
} as const satisfies Record<CompassFindingLevel, string>;

const STYLES = `
  header { align-items: center; display: flex; gap: 1em; justify-content: space-between; }
  h1 { font-size: 22px; font-weight: 600; margin: 0; }
  h2 { font-size: 16px; font-weight: 600; margin: 1.5em 0 0.25em; text-transform: capitalize; }
  p { margin: 0.5em 0; }
  ul { display: grid; gap: 0.5em; list-style: none; margin: 0.75em 0 0; padding: 0; }
  li { align-items: baseline; display: flex; gap: 0.75em; }
  code { background: rgba(255, 255, 255, 0.1); border-radius: 4px; font-size: 0.9em; padding: 0.1em 0.3em; }
  a { color: rgba(224, 204, 250, 1); }
  .muted { color: rgba(191, 193, 201, 1); font-size: 14px; }
  .error { color: rgba(249, 196, 215, 1); }
  astro-dev-toolbar-window { max-height: 480px; overflow-y: auto; width: min(640px, 100%); }
`;

export default defineToolbarApp({
  init(canvas, app, server) {
    const pathname = window.location.pathname;
    const toolbarWindow = document.createElement("astro-dev-toolbar-window");
    const style = document.createElement("style");
    style.textContent = STYLES;
    canvas.append(style, toolbarWindow);

    renderContent(toolbarWindow, `<p class="muted">Reviewing this page…</p>`);

    server.on<ToolbarResultPayload>(TOOLBAR_RESULT_EVENT, (result) => {
      if (result.pathname !== pathname) return;

      renderContent(toolbarWindow, getResultHtml(result));
      app.toggleNotification(getNotification(result));
    });

    server.send<ToolbarReviewPayload>(TOOLBAR_REVIEW_EVENT, { pathname });
  },
});

function renderContent(toolbarWindow: HTMLElement, html: string) {
  toolbarWindow.innerHTML = `
    <header>
      <h1>Compass</h1>
      <a class="muted" href="${DOCS_URL}" target="_blank" rel="noopener">How does this work?</a>
    </header>
    ${html}
  `;
}

function getResultHtml(result: ToolbarResultPayload) {
  switch (result.status) {
    case "error":
      return `<p class="error">The review failed: ${formatMessage(result.message)}</p>`;
    case "unavailable":
      return `<p class="muted">This page is not a Starlight documentation page and cannot be reviewed.</p>`;
    case "reviewed":
      return result.results.length === 0
        ? `<p class="muted">No rule applies to this page.</p>`
        : [
            `<p class="muted">${escapeHtml(result.filePath ?? result.pathname)}${result.model ? ` · ${escapeHtml(result.model)}` : ""}</p>`,
            ...result.results.map(
              ({ findings, rule, summary }) => `
                <h2>${escapeHtml(rule)}</h2>
                ${summary ? `<p>${formatMessage(summary)}</p>` : ""}
                ${findings.length > 0 ? `<ul>${findings.map(getFindingHtml).join("")}</ul>` : ""}
              `
            ),
          ].join("");
  }
}

function getFindingHtml({
  level,
  message,
}: {
  level: CompassFindingLevel;
  message: string;
}) {
  return `
    <li>
      <astro-dev-toolbar-badge badge-style="${LEVEL_BADGE_STYLES[level]}" size="small">${level}</astro-dev-toolbar-badge>
      <span>${formatMessage(message)}</span>
    </li>
  `;
}

function getNotification(result: ToolbarResultPayload) {
  if (result.status === "error")
    return { level: "error", state: true } as const;
  if (result.status !== "reviewed") return { state: false } as const;

  const levels = new Set(
    result.results.flatMap(({ findings }) => findings.map(({ level }) => level))
  );
  if (levels.has("error")) return { level: "error", state: true } as const;
  if (levels.has("warning")) return { level: "warning", state: true } as const;

  return { state: false } as const;
}

function formatMessage(message: string) {
  return escapeHtml(message).replace(INLINE_CODE_RE, "<code>$1</code>");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
