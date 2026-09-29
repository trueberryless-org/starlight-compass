import { pathToFileURL } from "node:url";
import { stripVTControlCharacters, styleText } from "node:util";
import terminalLink from "terminal-link";

import type { Reporter } from ".";
import { formatAuditSummary } from "../libs/report";
import type { CompassFindingLevel } from "../libs/rule";

const LEVEL_SYMBOLS: Record<CompassFindingLevel, string> = {
  error: styleText("red", "✗"),
  info: styleText("blue", "i"),
  warning: styleText("yellow", "⚠"),
};

const GUTTER = " ";

export const cliReporter: Reporter = {
  name: "CLI",
  report(report) {
    for (const file of report.files) {
      console.error(
        `\n${GUTTER} ╭─ ${styleText("blue", fileLink(file.displayPath, file.filePath))}`
      );
      console.error(`${GUTTER} ·`);

      for (const { documentationUrl, level, message, rule } of file.findings) {
        console.error(`${LEVEL_SYMBOLS[level]} | ${message}`);
        console.error(
          `${GUTTER} · ${styleText("dim", `╰── ${urlLink(rule, documentationUrl)}`)}`
        );
      }
    }

    const summary = formatAuditSummary(report);

    if (report.files.length === 0) logSummary("green", summary);
    else logSummary(report.isFailing ? "red" : "yellow", summary);
  },
};

export function logStep(name: string) {
  process.stdout.write(`\n${styleText(["bgGreen", "black"], ` ${name} `)}\n`);
}

function logSummary(color: "green" | "red" | "yellow", text: string) {
  const length = stripVTControlCharacters(text).length;

  console.error(
    `\n${styleText(color, "╭─")}${" ".repeat(length)}${styleText(color, "─╮")}`
  );
  console.error(`${styleText(color, "·")} ${text} ${styleText(color, "·")}`);
  console.error(
    `${styleText(color, "╰─")}${" ".repeat(length)}${styleText(color, "─╯")}\n`
  );
}

function fileLink(text: string, path: string | undefined) {
  return path ? urlLink(text, pathToFileURL(path).toString()) : text;
}

function urlLink(text: string, url: string | undefined) {
  return url ? terminalLink(text, url, { fallback: false }) : text;
}
