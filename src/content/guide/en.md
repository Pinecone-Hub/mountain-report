---
title: Editor guide
description: How to open the content editor, review changes before they go live, and add a section, a figure, a reference or a PDF.
---

This guide explains how to edit the report with the content editor. It describes the steps only. The editor itself is English only.

## Open the editor

- The live editor is at the [`admin/`](../admin/) page of this site. It needs a GitHub account with access to the repository of the report. Choose to log in with GitHub and allow access when asked.
- To try the editor without an account, open the [`admin-demo/`](../admin-demo/) page. It shows the real content, but changes are not saved. Reloading the page starts again.

The editor has these collections: Pages (Home, Summary, FAQ, Glossary, About), Chapters, Figures, References, Downloads and Settings. Pages, Chapters and Figures show two panes side by side, Writing in EN and Writing in FR. Fill in or edit the pane of each language. A language with no text yet is left out of the site.

## Review changes before they are published

The editor uses an editorial workflow. Saving an entry does not change the live site.

1. Edit an entry and choose Save. The status becomes Draft.
2. Use the Status menu to set In review when the change is ready to be read by someone else.
3. Set Ready when the review is done.
4. Open the Publish menu in the same place and choose Publish now. The change is merged into the repository and the site is rebuilt. The new text appears after the build has finished.

To discard a draft, choose Delete unpublished changes.

## Add a section to a chapter

1. Open Chapters and choose the chapter, then edit the Body field.
2. Add a level-2 heading that starts with the section number, such as `## 1.4 Title of the section`. Write the text below it.
3. To link to the new section from another place, write its number in braces, such as `{1.4}`. The number becomes a link to the section.
4. Save the entry and edit the other language in the same way.

The list of chapters, their numbers and their titles in menus are set by a developer in the report configuration. The title in a Chapters entry is the heading of the chapter page. Chapters cannot be added in the editor.

## Add a figure

1. Open Figures and choose the add button above the list (the plus sign followed by Figures). Give the figure an id that uses lower-case letters, digits and hyphens, such as `fig-1-3`. Fill in the chapter, number, section, chart type, measure, series, sources, title, caption, alt text (at most 250 characters) and long description.
2. Save the entry. Add the figure to the other language as well.
3. Open the chapter and add a paragraph that contains only the word FIGURE, a colon, a space and the id of the figure, for example `FIGURE: fig-1-3`. Put it where the figure should appear.
4. The PNG, SVG and CSV files of a new figure are generated from the data by a developer. An editor does not create them.

To replace the generated files of an existing figure, open the figure and use the optional fields Replacement PNG, Replacement SVG and Replacement CSV. Upload the file in the field. Leave a field empty to use the file generated from the data. The replacement is used on the figure pages and on the Downloads page.

## Add a reference

1. Open References and choose the References entry. In the References list, choose Add references to add an item.
2. Fill in the key, type, authors, year and title. Add the other fields that apply, such as container, publisher, DOI and URL. Use the official source address.
3. Choose a short, unique key in lower case, for example `author2026topic`. Keys cannot be reused.
4. In the text of a chapter, cite the reference with its key in square brackets and an at sign, such as `[@author2026topic]`. Several references are written as `[@first; @second]`.

## Add a PDF

1. Open Downloads and choose the add button above the list (the plus sign followed by Downloads).
2. Fill in the title, language and date. Choose the kind: full report, chapter or other. For a chapter, choose which chapter.
3. In the File field, upload the PDF.
4. Save the entry and publish it. The file appears on the Downloads page of that language.

The host rejects files over 25 MiB, so keep each file below that size. The size shown on the Downloads page is computed automatically when the site is built, so there is no size field to fill in.
