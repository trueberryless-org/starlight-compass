import { vi } from "vitest";

import type { CompassClient, CompassResponse } from "../../libs/provider";
import type { CompassPage } from "../../libs/rule";

export function getTestPage(page?: Partial<CompassPage>): CompassPage {
  return {
    body: "Run `npm run build` and upload the `dist/` directory.",
    data: { title: "Deploy" },
    filePath: "src/content/docs/guides/deploy.md",
    id: "guides/deploy",
    pathname: "/guides/deploy/",
    ...page,
  };
}

export function getTestClient(options?: {
  choice?: string;
  confidence?: number;
  mixed?: number;
}): CompassClient {
  const { choice = "how-to", confidence = 0.9, mixed = 0.1 } = options ?? {};

  return {
    ask: vi.fn(async (): Promise<CompassResponse> => ({
      answers: {
        "diataxis/mixed": { probability: mixed, type: "boolean" },
        "diataxis/type": {
          choice,
          confidence,
          probabilities: { [choice]: confidence },
          type: "choice",
        },
      },
      model: "test-1.0.0",
    })),
    id: "test/latest",
  };
}
