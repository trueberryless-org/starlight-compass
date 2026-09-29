import { defineRouteMiddleware } from "@astrojs/starlight/route-data";

import { addCompassPage } from "./libs/store";

export const onRequest = defineRouteMiddleware((context) => {
  const { entry, isFallback } = context.locals.starlightRoute;
  if (isFallback) return;

  addCompassPage({
    body: entry.body ?? "",
    data: entry.data,
    filePath: entry.filePath,
    id: entry.id,
    pathname: context.url.pathname,
  });
});
