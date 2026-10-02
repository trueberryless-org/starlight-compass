/** English UI strings of the Compass components, which readers can override with Starlight's i18n. */
export const COMPASS_TRANSLATIONS = {
  "starlightCompass.ask.button": "Find pages",
  "starlightCompass.ask.error": "Something went wrong. Please try again later.",
  "starlightCompass.ask.label": "Ask the docs",
  "starlightCompass.ask.loading": "Looking through the docs…",
  "starlightCompass.ask.noIndex":
    "Search is only available on the built site. Run a build and preview it to try this.",
  "starlightCompass.ask.note":
    "This only links to pages of the documentation. It does not write answers.",
  "starlightCompass.ask.close": "Close",
  "starlightCompass.ask.open": "Ask the docs",
  "starlightCompass.ask.placeholder": "How do I …?",
  "starlightCompass.ask.results": "These pages should answer your question:",
  "starlightCompass.ask.unanswered":
    "The documentation does not seem to answer this question. Try rephrasing it or search for keywords.",
  "starlightCompass.badge.explanation": "Explanation",
  "starlightCompass.badge.explanation.description":
    "Background and reasoning to help you understand a topic.",
  "starlightCompass.badge.how-to": "How-to guide",
  "starlightCompass.badge.how-to.description":
    "Steps to solve a specific problem or reach a goal.",
  "starlightCompass.badge.reference": "Reference",
  "starlightCompass.badge.reference.description":
    "Precise technical descriptions to look things up.",
  "starlightCompass.badge.tutorial": "Tutorial",
  "starlightCompass.badge.tutorial.description":
    "A guided lesson that teaches you by building something.",
  "starlightCompass.feedback.error":
    "Something went wrong. Please try again later.",
  "starlightCompass.feedback.label":
    "Tell us what could be better on this page",
  "starlightCompass.feedback.placeholder":
    "A typo, a mistake, something missing or something confusing …",
  "starlightCompass.feedback.submit": "Send feedback",
  "starlightCompass.feedback.thanks": "Thank you for your feedback!",
} as const;

export type CompassTranslationKey = keyof typeof COMPASS_TRANSLATIONS;
