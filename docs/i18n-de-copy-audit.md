# German i18n Copy Audit

Scope: `src/lib/i18n/locales/de.json`

Reviewed all 764 German leaf strings against the English source and the surrounding product intent. Any key that scored below 9/10 before the pass was rewritten in the locale file. Keys left unchanged scored 9/10 or 10/10 for intent, grammar, tone, and UI fit.

## Rating Scale

- 10: Natural German, precise intent, product tone intact.
- 9: Good German; no rewrite needed.
- 8: Understandable, but a little translated, stiff, or inconsistent.
- 7: Meaning is mostly right, but flow or idiom hurts trust.
- 6 or lower: Literal, awkward, misleading, or off-brand.

## Section Audit

| Section | Keys | Rewritten | Pre-fix rating | Main issue fixed |
| --- | ---: | ---: | --- | --- |
| `common` | 6 | 2 | 8-10 | Replaced English UI leftovers like “Download”. |
| `mockups` | 34 | 18 | 7-10 | Made alert controls, journal entries, and rescue copy sound like real app UI. |
| `macOnly` | 8 | 5 | 8-10 | Removed stiff device wording and improved button labels. |
| `licenseScope` | 5 | 4 | 8-10 | Clarified ownership/scope in natural German. |
| `nav` | 12 | 1 | 9-10 | Changed “Geschichte” to “Verlauf” for the section intent. |
| `hero` | 7 | 5 | 5-10 | Replaced “Stille Kraft” with “Mehr Ruhe für den Akku Ihres MacBooks.” |
| `categories` | 8 | 2 | 8-10 | Swapped literal watt wording for “Ladeleistung live”. |
| `features` | 38 | 16 | 7-10 | Reworked alert, charge-limit, glance, and meeting copy for idiom and clarity. |
| `saga` | 7 | 3 | 7-10 | Made the battery diary metaphor less literal and more grounded. |
| `health` | 28 | 16 | 7-10 | Replaced translated health jargon with “Akkuzustand” and concrete app-drain wording. |
| `compare` | 128 | 28 | 7-10 | Smoothed comparison-table labels, update copy, and feature descriptions. |
| `thanks` | 35 | 16 | 7-10 | Fixed mixed `du`/`Sie`, awkward license delivery, and renewal phrasing. |
| `walkthrough` | 15 | 6 | 8-10 | Made “live” and “in motion” phrasing natural for German. |
| `newsletter` | 34 | 6 | 8-10 | Replaced technical “Token” wording with user-facing codes. |
| `featurePages` | 39 | 21 | 6-10 | Rewrote literal feature-page paragraphs section by section. |
| `pricing` | 67 | 28 | 7-10 | Cleaned plan language, trial copy, CTAs, and feature bullets. |
| `faq` | 44 | 18 | 7-10 | Improved answers for pricing, refunds, charge limit, updates, and Meeting Battery Guard. |
| `contact` | 54 | 17 | 8-10 | Made support/contact copy more conversational without losing clarity. |
| `download` | 11 | 7 | 7-10 | Reworked install/trust copy and “gratis” wording. |
| `footer` | 9 | 1 | 8-10 | Smoothed the owner-to-owner tagline. |
| `checkout` | 45 | 14 | 8-10 | Tightened merchant, activation, summary, and error copy. |
| `privacy` | 76 | 34 | 8-10 | Kept legal intent while improving German grammar and false friends. |
| `legal` | 54 | 12 | 8-10 | Smoothed imprint/legal wording without changing legal substance. |

## Notable Decisions

- Kept canonical plan names `Lifetime` and `Yearly Patron` visible, per project glossary.
- Used `Reisemodus` for German-facing feature labels where the UI intent is descriptive.
- Preserved all interpolation placeholders (`{{price}}`, `{{trial}}`, etc.) and React translation tags (`<0>...</0>`).
- Kept privacy/legal sections more formal than marketing sections, because precision matters more there than warmth.
