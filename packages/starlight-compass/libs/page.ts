import type { CompassPage } from "./rule";

/** Splash pages and empty pages have no documentation content worth reviewing. */
export function isReviewablePage(page: CompassPage) {
  return page.data["template"] !== "splash" && page.body.trim() !== "";
}

export function getStringData(page: CompassPage, key: string) {
  const value = page.data[key];

  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

export function getStringListData(page: CompassPage, key: string) {
  const value = page.data[key];

  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function getPageTitle(page: CompassPage) {
  return getStringData(page, "title") ?? page.pathname;
}
