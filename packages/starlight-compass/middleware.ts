import { defineRouteMiddleware } from "@astrojs/starlight/route-data";

import { getPageSidebar } from "./libs/sidebar";
import { addCompassPage } from "./libs/store";

export const onRequest = defineRouteMiddleware((context) => {
  const { entry, headings, isFallback, locale, sidebar } =
    context.locals.starlightRoute;
  if (isFallback) return;

  addCompassPage({
    body: entry.body ?? "",
    data: entry.data,
    filePath: entry.filePath,
    headings: headings.map(({ text }) => text),
    id: entry.id,
    locale,
    pathname: context.url.pathname,
    sidebar: getPageSidebar(sidebar),
  });
});
