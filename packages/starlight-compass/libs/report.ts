import { fileURLToPath } from "node:url";

import {
  type CompassReview,
  type CompassReviewFinding,
  getReviewFindings,
} from "./review";
import type { CompassFindingLevel } from "./rule";

const REPORTED_LEVELS = new Set<CompassFindingLevel>(["error", "warning"]);

export function getAuditReport(
  reviews: CompassReview[],
  options: AuditReportOptions
): AuditReport {
  const { failOn, root } = options;

  const reviewedPages = reviews.filter((review) => review.results.length > 0);
  const files = reviewedPages
    .map((review) => ({
      displayPath: review.page.filePath ?? review.page.pathname,
      filePath: review.page.filePath
        ? fileURLToPath(new URL(review.page.filePath, root))
        : undefined,
      findings: getReviewFindings(review).filter((finding) =>
        REPORTED_LEVELS.has(finding.level)
      ),
    }))
    .filter((file) => file.findings.length > 0);
  const findings = files.flatMap((file) => file.findings);
  const errorCount = findings.filter(({ level }) => level === "error").length;
  const warningCount = findings.length - errorCount;

  return {
    errorCount,
    files,
    isFailing:
      failOn === "never"
        ? false
        : failOn === "warning"
          ? findings.length > 0
          : errorCount > 0,
    models: [
      ...new Set(reviewedPages.flatMap(({ model }) => (model ? [model] : []))),
    ],
    pageCount: reviewedPages.length,
    warningCount,
  };
}

export function formatAuditSummary(report: AuditReport): string {
  const { errorCount, files, pageCount, warningCount } = report;

  if (files.length === 0) {
    return `All ${pluralize(pageCount, "page")} passed the audit.`;
  }

  const counts = [
    errorCount > 0 ? pluralize(errorCount, "error") : undefined,
    warningCount > 0 ? pluralize(warningCount, "warning") : undefined,
  ].filter(Boolean);

  return `Found ${counts.join(" and ")} in ${pluralize(files.length, "file")}.`;
}

export function pluralize(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export interface AuditReport {
  errorCount: number;
  /** Files with at least one error or warning. */
  files: AuditReportFile[];
  isFailing: boolean;
  models: string[];
  /** The number of pages reviewed by at least one rule. */
  pageCount: number;
  warningCount: number;
}

export interface AuditReportFile {
  displayPath: string;
  /** The absolute path of the source file. */
  filePath: string | undefined;
  findings: CompassReviewFinding[];
}

interface AuditReportOptions {
  failOn: CompassFindingLevel | "never";
  root: URL;
}
