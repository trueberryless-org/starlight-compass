import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightCompass from "starlight-compass";

const site =
  (process.env.CONTEXT === "deploy-preview" ||
  process.env.CONTEXT === "branch-deploy"
    ? process.env.DEPLOY_PRIME_URL
    : process.env.URL) ?? "https://starlight-compass.netlify.app";

export default defineConfig({
  site,
  integrations: [
    starlight({
      title: "Starlight Compass",
      head: [
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: new URL("og.png", site).href,
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image:alt",
            content: "Review docs with typed AI decisions.",
          },
        },
      ],
      editLink: {
        baseUrl:
          "https://github.com/trueberryless-org/starlight-compass/edit/main/docs/",
      },
      plugins: [starlightCompass()],
      sidebar: [
        {
          label: "Start Here",
          items: [{ slug: "getting-started" }],
        },
        {
          label: "Guides",
          items: [
            { slug: "guides/audit-in-ci" },
            { slug: "guides/write-a-custom-rule" },
          ],
        },
        {
          label: "Reference",
          items: [
            { slug: "reference/configuration" },
            { slug: "reference/providers" },
            { slug: "reference/rules" },
          ],
        },
        {
          label: "Concepts",
          items: [
            { slug: "concepts/how-it-works" },
            { slug: "concepts/diataxis" },
            { slug: "concepts/roadmap" },
          ],
        },
      ],
      social: [
        {
          icon: "blueSky",
          label: "BlueSky",
          href: "https://bsky.app/profile/felixs.dev",
        },
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/trueberryless-org/starlight-compass",
        },
      ],
    }),
  ],
});
