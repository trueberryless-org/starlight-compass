import type { AstroIntegrationLogger } from "astro";

import type { AuditReport } from "../libs/report";

export async function runReporters(
  reporters: Reporter[],
  report: AuditReport,
  context: ReporterContext
) {
  for (const reporter of reporters) {
    try {
      await reporter.report(report, context);
    } catch (error) {
      context.logger.warn(
        `Failed to run the ${reporter.name} reporter: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

export interface Reporter {
  name: string;
  report: (
    report: AuditReport,
    context: ReporterContext
  ) => void | Promise<void>;
}

export interface ReporterContext {
  env: Record<string, string | undefined>;
  logger: AstroIntegrationLogger;
}
