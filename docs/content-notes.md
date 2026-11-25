# Content notes (stage 2)

Checked on 25 November 2026 against the approved sources in `docs/plan.md`. Citation keys refer
to `src/data/references.json`. Revised after the source-verifier report
(`docs/verification/stage-2.md`, 172 rows).

**SROCC page numbers** below are the printed page numbers of the chapter (pp. 131-202), which
match the page range in the reference. In the extracted text file, printed page = PDF page + 130.
**ICIMOD study page numbers** are the printed page numbers of the study.

## Source access

| Key | What was read | Status |
| --- | --- | --- |
| `wmo2026sogc` | Full report text (extracted from the PDF), landing page on wmo.int, launch press release of 23 March 2026; WMO e-Library record (per Dan) | Read. Glacier indicator on pp. 5, 16-17 |
| `wgms2026amce` | wgms.ch/mass_change_estimates/ and the DataCite record for 10.5904/wgms-amce-2026-02-10 (DOI resolves to the WGMS page) | Read |
| `dussaillant2025essd` | Article page on essd.copernicus.org | Read |
| `glambie2025` | Open-access full text on PubMed Central (PMC11903323) and Europe PMC record | Read |
| `zemp2026` | nature.com article page (abstract, key points, figure caption, back matter) | Read. Body text not on the page |
| `hock2019srocc` | Full chapter text (extracted from the PDF) | Read: Executive Summary pp. 133-135; 2.2.3 pp. 141-142; 2.3.2 pp. 158-164; 2.4 and 2.5 pp. 173-174; Table 2A.1 pp. 199-202 |
| `egu26-19777` | Abstract page on meetingorganizer.copernicus.org | Read |
| `egu26-6599` | Abstract page on meetingorganizer.copernicus.org | Read |
| `icimod2025thame` | Record page on lib.icimod.org and the full study (local extract, not in the repo) | Read. Stable PDF URL: https://lib.icimod.org/records/8g9ze-1r153/files/Thame%20Valey%20GLOF%202024-n.pdf?download=1 |
| `icimod2025press` | Press release page on icimod.org, 14 October 2025 | Read |

## Reference notes

- **WMO report number**: `references.json` uses WMO-No. 1391 and ISBN 978-92-63-11391-7, as on the
  WMO e-Library record (https://library.wmo.int/records/item/69807-state-of-the-global-climate-2025),
  the cover and the imprint (pp. 1-2). The PDF's "How to cite" box (p. 4) gives WMO-No. 1342 and
  ISBN 978-92-63-11299-7, which conflicts with the e-Library record, cover and imprint. The
  reference schema has no ISBN field, so the ISBN is recorded here only.
- **SROCC year**: the chapter's own citation (p. 131) gives Hock et al., 2019. Cambridge Core lists
  the 2022 Cambridge edition (online 2 February 2022), which is the target of the DOI
  10.1017/9781009157964.004.
- **WGMS dataset**: version 2026-02-10 (Dan's decision). Earlier versions 2025-02b and 2025-02 are
  superseded for this site.

## Calibrated terms

Only IPCC calibrated terms taken from SROCC are used, set in italics as SROCC does (p. 133,
footnotes 1 and 2). Bellwald's "very likely" and "most likely" are his own words, set in
quotation marks, attributed to him and labelled in chapter 2 as not IPCC calibrated.

### Chapter 1

| Section | Term and statement | Source location |
| --- | --- | --- |
| 1.3.2 | *very high confidence*: glacier decline in high mountains in recent decades due to climate change | Executive Summary, p. 133 |
| 1.3.2 | *very likely*: atmospheric warming is the primary driver of global glacier recession | 2.2.3, p. 142 |
| 1.3.2 | *very likely*: mountain glacier mass budget −490 ± 100 kg m⁻² yr⁻¹ (−123 ± 24 Gt yr⁻¹), 2006-2015 | Executive Summary, p. 133; 2.2.3, p. 142 |
| 1.3.2 | *likely*: regional budgets most negative (below −850 kg m⁻² yr⁻¹) in southern Andes, Caucasus, European Alps and Pyrenees | Executive Summary, p. 133 only |

### Chapter 2

| Section | Term and statement | Source location |
| --- | --- | --- |
| 2.1.1 | *high confidence*: glacial lakes more numerous and larger in most regions in recent decades | Executive Summary, p. 133 |
| 2.1.1 | *limited evidence*: change in GLOF frequency | Executive Summary, p. 133 |
| 2.1.1 | *high confidence*: lakes will keep growing in number and area in most regions | 2.3.2.1.3, p. 161 |
| 2.1.2 | *high confidence*: exposure of people and infrastructure increased; trend expected to continue | 2.3.2.2.1, p. 162 |
| 2.2.1 | *high confidence*: slopes less stable with glacier retreat and permafrost thaw | Executive Summary, p. 133 |
| 2.2.1 | *high confidence*: rock fall more frequent in degrading permafrost over the past half-century | 2.3.2.1.1, p. 158 |
| 2.2.1 | *high confidence*: glacier retreat destabilised adjacent slopes, years to millennia | 2.3.2.1.1, p. 159 |
| 2.2.1 | *medium evidence, high agreement*: large failures of steep glaciers frozen to their beds | 2.3.2.1.1, p. 159 |
| 2.2.2 | *limited evidence*: observed event chains as a basis for projections | 2.3.2.1.4, p. 162 |
| 2.2.2 | *high confidence*: cascading events will also occur where there is no earlier record | Executive Summary, p. 134 |
| 2.3.3 | "very likely", "most likely" (Bellwald) | EGU26-6599 abstract. Not IPCC calibrated |

### Chapter 3

| Section | Term and statement | Source location |
| --- | --- | --- |
| 3.3.1 | *medium confidence*: effective governance as a key enabler of disaster risk reduction | Executive Summary, p. 135 |
| 3.3.1 | *medium confidence*: integrative social-ecological risk perspective | 2.3.2.3, p. 163 |
| 3.3.1 | *high confidence*: substantial risk reduction and adaptation required | 2.3.2.2.3, p. 163 |
| 3.4.3 | *high confidence*: integrating natural sciences, social sciences and humanities is most efficient | 2.3.2.3, p. 164 |

### Summary, FAQ, glossary, home

- Summary (blocked by a tool guard; content returned in the report for the coordinator to save as
  `src/content/en/summary.md`): A.3 *very likely* (p. 133); B headline *high confidence* twice
  (p. 133); B.1 *limited evidence* (p. 133), *high confidence* (p. 161); B.2 *high confidence*
  (p. 158); B.3 *high confidence* (p. 162); C.1 *medium confidence* (p. 135), *high confidence*
  (p. 163).
- FAQ: *high confidence*, *limited evidence* (p. 133); Bellwald's "most likely" in quotation marks.
- Glossary: confidence, evidence and agreement, and likelihood from p. 133, footnotes 1 and 2.
- Home, key message B: two *high confidence* statements (p. 133). Rendering of italics inside
  front-matter strings to be checked in the template.

## Points of uncertainty

### Chapter 1

- **1.2, "since 1975"** (`zemp2026`): the abstract says "since 1975"; Fig. 1 starts at 1976. Kept
  as stated, with the inconsistency noted.
- **1.4 and 1.5, Zemp uncertainty level**: not stated on the page.
- **1.2 and 1.5, ESSD values**: presented as the paper's results to 2024, not as values from
  version 2026-02-10. Only Zemp et al. (who use 2026-02-10) are cited for 2025.
- **1.5, GlaMBIE shares**: the 20% (glaciers) and 17% (Greenland) shares use contributions for
  2002-2021 divided by observed sea-level rise for 2003-2016 (3.64 ± 0.26 mm per year). Both
  periods are now stated.
- **1.5, ice-sheet comparison**: attached to 2002-2021, as the verifier reports for the source.
- **1.5, WMO 21%**: WMO (p. 17), all glaciers, 1993-2018, from WMO's endnote 27.
- **1.1 and 3.1, survey timescale**: "decadal", as in the ESSD abstract.

### Chapter 2

- **2.1.1, dam types**: summary of SROCC p. 161 (moraine-dammed lakes; floods when ice dams
  breach). SROCC has no formal GLOF definition in the chapter.
- **2.1.1, Himalaya trend**: one study reported by SROCC, not an SROCC assessment finding.
- **2.1.3, Dig Tsho**: the economic loss figure was removed. SROCC (p. 163) gives 500 million USD;
  the ICIMOD study (p. 3) gives an estimated $1.5 million and says the flood destroyed the nearly
  completed Namche hydropower plant. The two approved sources conflict, so no figure is given.
- **2.2.1, glacier collapse**: Kolka and Aru removed (Dan's cut); the rare-type description stays
  in 2.2.1 and is not applied to Blatten.
- **2.3.1, Blatten lake**: "damaged further parts of the village" (`egu26-19777`). The outflow
  mechanism was removed; only Bellwald's listed stages (lake up-valley, new river bed) remain.
- **2.3.3, Bellwald causes**: now includes "unfavourable geology combined with melting permafrost".
- **2.4.1, breach**: "up to 22 m in height and 51 m in width" (record); the study (p. 35) gives
  approximately 22 m in height and up to 51 m in width.
- **2.4.1, lake identity**: the lake "at 4,900 metres" is taken to be Upper Ngole Cho, because both
  sources describe it as the lake hit first.
- **2.4.2, panic**: from the study (p. 3), which cites a secondary source for it.
- **2.4.3, attribution**: "climate-driven" is a quote from co-author Sudan Bikash Maharjan.
- **2.5**: the causal "rock loading led to the collapse" and the "most damaging effects" sentence
  were removed. The paragraph now states the sequence only.

### Chapter 3

- **3.2.3, Thame warning**: the study does not report whether a warning was issued. It recommends
  monitoring stations for real-time information, better flood-risk assessment and the development
  of early warning systems (p. 36). No inference is drawn about whether a warning existed.
- **3.2.3, HKH-wide monitoring**: removed (could not be verified on the press release).
- **3.3.1, governance**: worded as "taking account of exposure factors (planning, zoning and
  urbanisation pressures)", as Dan asked, with the list in brackets to avoid a long verbatim run.
- **3.4.1, measures**: immediate measures are only the record's three (fill and protect tension
  cracks, stabilise riverbanks, channel the river). Erosion control and satellite imagery are under
  risk mitigation (record); bank protection is cited to the press release.
- **3.4.3**: Kedarnath removed (Dan's cut).
- **Blatten**: the evacuation details, the monitoring arrangements beyond the abstracts, and the
  reconstruction lead and funding were removed from the text (Dan's decision).

### About

- Contains Dan's sentence on AI-assisted drafting. The GlaMBIE licence claim was removed
  (it could not be verified).

## Final revision (Dan's cuts and verifier re-check)

- Cuts applied: ch. 1 validation paragraph, HMA list, "155 of about 170", WMO 21%, "two
  approaches"; ch. 2 section 2.5, 2.1.3 (HKH), ice break-off and rare collapse type in 2.2.1,
  Thyanbo narrowing, Jacquemart glacier history; ch. 3 Laguna 513/Palcacocha, 3.4.3, Blatten
  reconstruction methods, Thame partners, third paragraph of 3.5, Tsho Rolpa.
- Headings renamed: 2.2 "Unstable slopes and hazard cascades", 2.2.1 "Slopes". No section
  renumbered; removed sections (2.1.3, 2.5, 3.4.3) were last in their parent section.
- Thame dam types (full study pp. 5, 24 and section 3.2): Upper Ngole Cho is bedrock-dammed with a
  thin moraine cover (the wave eroded a 4.5 m thick moraine on top of the bedrock); Lower Ngole
  Cho is end-moraine-dammed.
- Bellwald causes: factors stated side by side; the geology phrase is quoted.
- Thame measures (study pp. 35-36): crack filling or protection, riverbank protection and erosion
  control, river channelling with check dams, spurs and diversion berms from about 1 km upstream;
  stereo satellite images suggested separately.
- Governance (3.3.1 and Summary C.1): rewritten from scratch (*medium confidence*, p. 135).
- Laguna 513: one sentence restored in 3.2.1 (SROCC Box 2.4, p. 164), supporting Summary C.2 and
  the FAQ answer, which now points to 3.2.1, 3.2.2 and 3.3.1.
- Glossary: only terms used in the chapters or Summary body are kept (13 entries). Removed:
  Ablation zone, Accumulation zone, Albedo, Calving, Glacier collapse, Glacier surge. "Evidence and
  agreement" renamed "Evidence", because "agreement" is no longer used in the text.

## Text review (Dan, style and structure)

- **For a stage 3 footnote (moved out of 1.2):** Zemp et al. give the start of the cumulative
  period as 1975, while their Fig. 1 of global mass change begins with the hydrological year 1976
  [@zemp2026].
- Units now follow IPCC style (Gt yr⁻¹, mm yr⁻¹, m w.e. yr⁻¹, kg m⁻² yr⁻¹); values unchanged.
- Repetition removed in 3.1, 3.3.3 and 3.5, replaced with {x.y} cross-references; 2.1 opening
  paragraph removed; 1.3.1 renamed "Regional differences".

## Remaining markers

- No TODO_SOURCE remains.
- TODO_FIGURE: chapter 1, sections 1.2 and 1.3.2.

## Style

- Percentages "41%" (IPCC convention), no em-dashes, British spelling.
- No run of seven or more consecutive words from a source, except names, titles and short
  quotations marked as such.
