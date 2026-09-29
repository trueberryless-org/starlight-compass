import { appendFileSync } from "node:fs";
import { isAbsolute, posix, relative, sep } from "node:path";

import type { Reporter } from ".";
import { type AuditReport, formatAuditSummary } from "../libs/report";

const LEVEL_LABELS = {
  error: "❌ Error",
  info: "ℹ️ Info",
  warning: "⚠️ Warning",
} as const;

/**
 * Writes the audit report to the GitHub Actions job summary.
 *
 * @see https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#adding-a-job-summary
 */
export const gitHubActionsReporter: Reporter = {
  name: "GitHub Actions",
  report(report, { env }) {
    const summaryPath = env["GITHUB_STEP_SUMMARY"];
    if (!summaryPath) return;

    appendFileSync(summaryPath, renderGitHubActionsReport(report, env), "utf8");
  },
};

export function renderGitHubActionsReport(
  report: AuditReport,
  env: Record<string, string | undefined>
): string {
  const status =
    report.files.length === 0
      ? "✅ **Documentation audit passed.**"
      : report.isFailing
        ? "❌ **Documentation audit failed.**"
        : "⚠️ **Documentation audit passed with warnings.**";
  const models =
    report.models.length > 0
      ? ` Reviewed with ${report.models.map((model) => `\`${model}\``).join(", ")}.`
      : "";

  const lines = [
    "",
    "## Starlight Compass",
    "",
    status,
    "",
    `${formatAuditSummary(report)}${models}`,
    "",
  ];

  if (report.files.length > 0) {
    lines.push(
      "| File | Level | Finding | Rule |",
      "| --- | --- | --- | --- |",
      ...report.files.flatMap((file) =>
        file.findings.map(({ documentationUrl, level, message, rule }) => {
          const fileCell = formatFileLink(file.displayPath, file.filePath, env);
          const ruleCell = documentationUrl
            ? `[${rule}](${documentationUrl})`
            : rule;

          return `| ${escapeTableCell(fileCell)} | ${LEVEL_LABELS[level]} | ${escapeTableCell(message)} | ${escapeTableCell(ruleCell)} |`;
        })
      ),
      ""
    );
  }

  return lines.join("\n");
}

function formatFileLink(
  displayPath: string,
  filePath: string | undefined,
  env: Record<string, string | undefined>
) {
  const label = `\`${displayPath}\``;
  const url = filePath ? getGitHubFileUrl(filePath, env) : undefined;

  return url ? `[${label}](${url})` : label;
}

function getGitHubFileUrl(
  filePath: string,
  env: Record<string, string | undefined>
) {
  const repository = env["GITHUB_REPOSITORY"];
  const sha = env["GITHUB_SHA"];
  const workspace = env["GITHUB_WORKSPACE"];
  if (!repository || !sha || !workspace) return;

  const path = relative(workspace, filePath);
  if (path.startsWith("..") || isAbsolute(path)) return;

  const encodedPath = path.split(sep).map(encodeURIComponent).join(posix.sep);

  return `https://github.com/${repository}/blob/${sha}/${encodedPath}?plain=1`;
}

function escapeTableCell(content: string) {
  return content.replaceAll("|", String.raw`\|`);
}
