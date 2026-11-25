---
title: Accessibility statement
description: The accessibility status of this demonstration site, how it was
  tested, its known limits and how to report a problem.
---

## Status

This statement was prepared on 25 November 2026. The site aims to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA. It is a demonstration site, not a production service, and this statement describes the state of the demonstration at that date.

## How the site was tested

Automated tests with axe-core, run through Playwright in the Chromium browser, covered every page of the site in English and French, and the Arabic Summary. Each page was tested at a desktop viewport and at a mobile viewport, against the WCAG 2.0, 2.1 and 2.2 rules at levels A and AA. At the date of this statement, these tests found no violations.

Scripted keyboard checks confirm that:

- the first press of the Tab key reaches the skip link;
- the tooltips of IPCC calibrated terms open on focus and close with the Escape key;
- citation links lead to the reference and back;
- the chart can be read with the arrow keys;
- the figure lightbox opens, closes with the Escape key and returns focus;
- the FAQ entries open with the keyboard.

A full manual keyboard walkthrough and testing with screen readers are planned for the release stage. They have not yet been carried out.

## Accessibility features

- Every page has one main landmark and a skip link.
- Every page has a single level-one heading.
- Keyboard focus is visible.
- Figures have alternative text, a caption, a long description and a data table.
- Charts work without JavaScript, as images with their data tables. Reading the chart interactively requires JavaScript.
- Content works without JavaScript, except search and the year readout on charts.
- The site respects the reduced motion setting.
- Text and colours meet the level AA contrast requirements.
- The site is available in English and French, with a Summary in Arabic in a right-to-left layout.

## Known limits

- The Arabic Summary was machine-translated for demonstration purposes and has not been reviewed by a translator.
- The downloadable PDF files are placeholders and are not tagged for accessibility.
- Search requires JavaScript.
- The content editor pages (admin and admin-demo) use Decap CMS, a third-party interface. They are not covered by this statement.
- Videos come from YouTube and load only after a click. Their captions depend on the original publisher.

## Feedback

To report an accessibility problem, please write to [hello@pinecone.lu](mailto:hello@pinecone.lu).
