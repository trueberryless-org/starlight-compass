import { z } from "astro/zod";

import { DIATAXIS_TYPES } from "./rules/diataxis";

/**
 * Extends the Starlight frontmatter schema with the fields read by the built-in rules.
 *
 * @see https://starlight-compass.netlify.app/reference/configuration/#frontmatter
 */
export function compassSchema() {
  return z.object({
    /**
     * The Diátaxis documentation type this page is meant to be, or `false` to skip the `diataxis` rule for this page.
     */
    diataxis: z.enum(DIATAXIS_TYPES).or(z.literal(false)).optional(),
  });
}
