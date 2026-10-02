import type { CompassPageSidebar } from "./rule";

/**
 * Finds the current page in the sidebar, which Starlight resolves for every page, and returns the groups leading to it.
 */
export function getPageSidebar(
  entries: SidebarEntry[]
): CompassPageSidebar | undefined {
  for (const entry of entries) {
    if (entry.type === "link") {
      if (!entry.isCurrent) continue;

      return { groups: [], siblings: getSiblings(entries) };
    }

    const sidebar = getPageSidebar(entry.entries);
    if (sidebar)
      return {
        groups: [entry.label, ...sidebar.groups],
        siblings: sidebar.siblings,
      };
  }

  return undefined;
}

function getSiblings(entries: SidebarEntry[]) {
  return entries.flatMap((entry) =>
    entry.type === "link" && !entry.isCurrent ? [entry.label] : []
  );
}

export type SidebarEntry = SidebarLink | SidebarGroup;

interface SidebarLink {
  isCurrent: boolean;
  label: string;
  type: "link";
}

interface SidebarGroup {
  entries: SidebarEntry[];
  label: string;
  type: "group";
}
