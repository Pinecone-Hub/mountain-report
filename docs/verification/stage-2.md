# Source verification, stage 2 (English content)

Run by the `source-verifier` agent on 25 November 2026, read-only. Scope: `src/data/references.json`
and all files in `src/content/en/`. Nothing has been changed yet; Dan decides the fixes.
Every row of the verifier's report is kept, with its status. In some long cells the quotes were
shortened to their key phrase.

Counts: OK 119, WRONG 2, OVERSTATED 10, TOO_CLOSE 31, UNCITED 2, BAD_REFERENCE 0,
CANNOT_VERIFY 8. Total 172 rows.

## Source legend

- WMO: State of the Global Climate 2025 PDF, page numbers (printed numbers identical). Official:
  https://wmo.int/publication-series/state-of-global-climate/state-of-global-climate-2025
- S: SROCC Ch. 2 PDF page (printed page = PDF page + 130). Official:
  https://doi.org/10.1017/9781009157964.004
- U1: https://wgms.ch/mass_change_estimates/
- U2: https://essd.copernicus.org/articles/17/1977/2025/
- U3: https://www.nature.com/articles/s41586-024-08545-z (Nature showed a cookie wall and PMC a bot
  check; text read from https://www.ebi.ac.uk/europepmc/webservices/rest/PMC11903323/fullTextXML,
  same article)
- U4: https://www.nature.com/articles/s43017-026-00777-z
- U5: https://meetingorganizer.copernicus.org/EGU26/EGU26-19777.html
- U6: https://meetingorganizer.copernicus.org/EGU26/EGU26-6599.html
- U7: https://lib.icimod.org/records/8g9ze-1r153
- U8: https://www.icimod.org/press-release/everest-region-a-hotspot-of-cryosphere-linked-hazards-icimods-new-study-on-nepals-2024-thame-flood-confirms/

The fetch tool returned the EGU and ICIMOD pages (U5 to U8) as short paraphrases and fragments,
so quotes from them are short.

## Table

| file:line | statement or reference | status | what the source says | source | note |
|---|---|---|---|---|---|
| references.json:3-13 | wmo2026sogc, WMO-No. 1391, DOI 10.59327/WMO/S/CRI/SOC1 | CANNOT_VERIFY | The DOI redirects to library.wmo.int/idurl/4/69807, whose record page showed no title. The wmo.int page shows "State of the Global Climate 2025", published 23 March 2026, with no number or DOI. The PDF cover and imprint (p.1-2) show "WMO-No. 1391" and the same DOI. | WMO p.2 | The PDF "How to cite" box (p.4) says WMO-No. 1342 and ISBN 978-92-63-11299-7. Tried: DOI, library record, wmo.int page. |
| references.json:15-24 | wgms2026amce, version 2026-02-10, DOI 10.5904/wgms-amce-2026-02-10 | OK | DOI resolves (302) to the WGMS page. "WGMS (2026): Annual mass-change estimates for the world's glaciers (version 2026-02-10)." Creator WGMS. | U1 | Publisher listed as WGMS and C3S. The page does not say "recommended"; 2026-02-10 is the newest version listed. |
| references.json:26-36 | dussaillant2025essd | OK | Title, seven authors, 2025, ESSD 17(5), 1977-2006 and DOI match. | U2 | |
| references.json:38-48 | glambie2025 | OK | "The GlaMBIE Team", Nature 639, issue 8054, 382-388, published 19 Feb 2025. DOI matches. | U3 | |
| references.json:50-59 | zemp2026 | OK | "Global glacier mass change in 2025", The WGMS Network, Nat. Rev. Earth Environ. 7, 213-215, online 7 April 2026. | U4 | |
| references.json:61-70 | hock2019srocc | OK | DOI resolves to the Cambridge chapter "High Mountain Areas", pp. 131-202. Authors and editors match the chapter's "Cite as" block. | S p.1 | Cambridge lists IPCC as author and 2022 as year; Dan chose Hock et al. 2019. |
| references.json:72-79 | egu26-19777 | OK | DOI resolves to the abstract page. Title and all 20 authors match. EGU 3-8 May 2026. | U5 | |
| references.json:81-88 | egu26-6599 | OK | DOI resolves. Title and author (Bellwald) match. | U6 | |
| references.json:90-99 | icimod2025thame | OK | DOI 10.53055/ICIMOD.1101 resolves. Title, three authors, ICIMOD and NDRRMA as publishers match. Published 24 Sep 2025. | U7 | |
| references.json:101-109 | icimod2025press | OK | Headline matches. Dateline 14 October 2025. | U8 | |
| references.json (all) | Every key cited; no citation without a reference; no work outside the approved list | OK | All 10 keys used; all 7 approved source groups covered. | plan.md | WGMS DOI differs from plan item 2 (2025-02b); Dan's source decision of 25 Nov 2026 overrides it. |
| summary.md:10 | Increasing rate; six of the highest-loss years in the past seven | OK | GlaMBIE: "an increase of 36 ± 10%". Zemp: "six of the highest mass-loss years on record occurring in the past seven years". | U3, U4 | Structure close to Zemp, no 8-word run. |
| summary.md:14 | 273 ± 16 Gt/yr, about 5%; 36 ± 10% | OK | "273 ± 16 gigatonnes in mass annually"; "about 5% globally"; "an increase of 36 ± 10%". | U3 | |
| summary.md:18 | 408 ± 132 Gt in 2025 | OK | "408 ± 132 Gt of mass during the hydrological year 2025". | U4 | |
| summary.md:18 | Eight of ten most negative mass balances since 1950 since 2016 | TOO_CLOSE | "Eight of the ten most negative annual glacier mass balances since 1950 have occurred since 2016." | WMO p.16 | 8-word run "mass balances since 1950 have occurred since 2016". Fact correct. |
| summary.md:22 | Central Europe 39%; SROCC *very likely* −490 ± 100 (−123 ± 24 Gt/yr), 2006-2015 | OK | "Central Europe (−39%)". SROCC: "was very likely -490 ± 100 kg m–2 yr–1 (-123 ± 24 Gt yr–1) in 2006–2015". | U3; S p.3, p.12 | |
| summary.md:26 | 18 ± 1 mm; SROCC 0.34 ± 0.07 mm/yr | OK | "18 ± 1 mm". Table 2A.1 "11 Mountain regions", 2006-2015, 0.34 ± 0.07 mm SLE yr–1. | U3; S p.72 | |
| summary.md:26 | 2002-2021 glacier contribution about 20% of observed rise | OVERSTATED | Table 1: "glaciers (this study, 2002–2021: 0.72 ± 0.04 mm yr−1, 20%)"; denominator "2003–2016: 3.64 ± 0.26 mm yr−1". | U3 | The 20% mixes two periods. Same at chapter-1:69. |
| summary.md:30 | About 500 field glaciers; WGMS combines for every glacier | OK | "approximately 500 glaciers worldwide"; both data types combined for all glaciers. | U2, U1 | |
| summary.md:30 | Surveys cover about 96% "over several years" | CANNOT_VERIFY | Abstract: "approximately 207 000 glaciers" (about 96%), "decadal glacier-wide elevation change estimates". "Several years" not found. | U2 | Tried abstract and body to character 100,000. |
| summary.md:34 | Lakes increased (*high confidence*); slopes less stable (*high confidence*) | TOO_CLOSE | "The number and area of glacier lakes has increased in most regions in recent decades (high confidence)"; "Glacier retreat and permafrost thaw have decreased the stability of mountain slopes". | S p.3 | One-word edits. Terms correct. Same in home.md:9. |
| summary.md:38 | Only *limited evidence* that GLOF frequency has changed | TOO_CLOSE | "there is only limited evidence that the frequency of glacier lake outburst floods (GLOF) has changed" | S p.3 | 9-word run. |
| summary.md:38 | Further lake growth in most regions (*high confidence*) | OK | "high confidence that the number and area of glacier lakes will continue to increase in most regions in the coming decades" | S p.31 | Also PDF p.4. |
| summary.md:42 | Rock fall more frequent in degrading permafrost, past half-century (*high confidence*) | TOO_CLOSE | "has increased within zones of degrading permafrost over the past half-century" | S p.28 | 8-word run. |
| summary.md:46 | Exposure of people and infrastructure increased (*high confidence*) | TOO_CLOSE | "high confidence that the exposure of people and infrastructure to cryosphere hazards in high mountain regions has increased over recent decades" | S p.32 | About 19 verbatim words. |
| summary.md:46 | Himalaya: up to two-thirds of hydropower projects in the path of glacier floods | TOO_CLOSE | "in the Himalaya alone, up to two-thirds of the current and planned hydropower projects are located in the path of potential glacier floods" | S p.32 | Same at chapter-2:23. |
| summary.md:50 | Blatten: 4 million m³; collapse 28 May 2025; village almost destroyed, evacuated; >9 and ~10 million m³; one life / loss of life avoided; no climate conclusion | OK | "around 4 million m3 of rock"; "which at this point was completely evacuated"; "claiming one life and causing the near-total destruction of the historic village of Blatten"; "approximately 10 million cubic meters"; "avoided loss of life". | U5, U6 | Climate sentence consistent with U5 (climate work only a stated aim). |
| summary.md:54 | Thame: rock avalanche, two lakes, 459,000 m³; 135 displaced, 25 homes, no deaths; co-author "climate-driven" | OK | "459,000 cubic metres"; "135 people and destroying 25 homes"; "no loss of life"; Maharjan: "this climate-driven event". | U8, U7 | Attributed to the co-author, as in the source. |
| summary.md:58 | Mapping, early warning, engineering applied; lessons-learned literature scarce | OK | "lessons learned from adaptation efforts generally remains scarce"; strategy list names these. | S p.33 | |
| summary.md:62 | Strategies; adaptation mostly reactive; significant risk reduction needed (*high confidence*) | OK | "mostly in the form of reactive responses"; "high confidence that ... significant risk reduction and adaptation strategies will be required". | S p.33 | |
| summary.md:62 | Effective governance is a key enabler (*medium confidence*) | TOO_CLOSE | "Effective governance is a key enabler for reducing disaster risk" | S p.5 | 8-word run. Term correct. |
| summary.md:62 | "Effective governance, including planning and zoning" | OVERSTATED | Governance should consider "exposure factors such as planning, zoning, and urbanisation pressures". | S p.5 | Planning and zoning are exposure factors, not parts of governance. |
| summary.md:66 | Early warning needs local engagement; Laguna 513 system destroyed 2017 | OK | "necessitate strong local engagement and capacity building"; "some local residents destroyed it in 2017 due to political, social and cultural conflicts". | S p.33, p.34 | Text says "a local conflict"; source "conflicts". |
| summary.md:70 | Blatten: deformation two weeks before; evacuated; Bellwald credits authorities; map Nov 2025; return by 2029 | OK | "around two weeks before the debris-ice avalanche"; "extensive monitoring and mitigation measures of the authorities"; "has been updated in November 2025"; "return of residents by 2029". | U6, U5 | |
| summary.md:74 | Thame: no deaths linked to daylight and phases; sources silent on warning; recommendations | OK | "the event's occurrence in daylight and phased nature of the flood due to the ponding, no loss of life". Record: "Install hydrological and meteorological stations"; "early warning systems". | U8, U7 | |
| summary.md:78 | Records sparse and short; satellites limited by cloud and terrain | OK | "limited spatial density and/or temporal extent of observation records at high elevations"; "dealing with cloud cover and rugged terrain" | S p.44 | |
| summary.md (all {x.y}) | Cross-references 1.1, 1.3, 1.3.1, 1.3.2, 1.4, 1.5, 2.1.1, 2.1.2, 2.2.1, 2.3, 2.4, 3.1, 3.2.1-3.2.3, 3.3.1-3.3.3, 3.4.1, 3.4.2 | OK | Every cross-referenced heading exists and supports its statement. | chapters | None OVERSTATED or BAD_REFERENCE. |
| chapter-1.md:11 | Four methods; some combine | OK | "four main methods are glaciological measurements, DEM differencing, altimetry, and gravimetry"; "hybrid approaches". | U3 | |
| chapter-1.md:13 | About 500 glaciers, under 0.2%; ~207,000 glaciers, 96% | OK | "approximately 500 glaciers"; "less than 0.2 %"; "approximately 207 000 glaciers". | U2 | |
| chapter-1.md:13 | Geodetic surveys "mostly over periods of several years" | CANNOT_VERIFY | Abstract says "decadal". | U2 | See summary.md:30. |
| chapter-1.md:15 | WGMS method: interpolation, 0.5° grid, region, globe; 1976-2025; regional 1915-1976 | OK | "spatially interpolate the annual mass balance anomalies"; "aggregated to gridded (0.5° latitude and longitude), regional, and global"; "from 1976 to 2025 AD"; "between 1915 and 1976". | U2, U1 | |
| chapter-1.md:15 | "The method uses geostatistical modelling." | UNCITED | No citation. Abstract supports it: "We use geostatistical modeling". | U2 | About claims every statement is cited. |
| chapter-1.md:15 | Geodetic data cover periods within 2000-2019 | OK | "global glacier coverage from 2000 to 2019". | U2 | Some geodetic records go back to the 1940s. |
| chapter-1.md:17 | Series to 2024; leave-out tests; earlier assessments; 68% CI | OK | "leave-one-out cross-validation"; "compare our results to earlier assessments"; "(68 % confidence interval)". | U2 | |
| chapter-1.md:19 | GlaMBIE: 233 estimates, ~450 contributors, 35 teams; 195 used; 95% CIs; gravimetry exclusions | OK | "233 estimates ... about 450 data contributors organized in 35 research teams"; "195 ... were used"; "95% confidence intervals". | U3 | |
| chapter-1.md:21 | "The two approaches use different periods and different uncertainty conventions." | UNCITED | No citation; restates facts supported earlier. | U2, U3 | |
| chapter-1.md:25 | 9,179 ± 621 Gt, 187 ± 20 Gt/yr; 41% last decade; 6% in 2023 | OK | "9179 ± 621 Gt (187 ± 20 Gt per year)"; "About 41 % (∼ 10 mm) ... 6 % ... in 2023 alone". | U2 | |
| chapter-1.md:27 | 9,583 ± 1,211 Gt since 1975; Fig. 1 from 1976 | OK | "Since 1975, cumulative loss is 9,583 ± 1,211 Gt"; Fig. 1 "hydrological years 1976−2025". | U4, U1 | |
| chapter-1.md:33 | 273 ± 16 Gt/yr; 6,542 ± 387 Gt; about 5% | OK | "totals −6,542 ± 387 Gt"; "about 5% globally". | U3 | |
| chapter-1.md:35 | 231 ± 23 and 314 ± 23 Gt/yr; +36 ± 10%; 548 ± 120 Gt in 2023 | OK | "from −231 ± 23 Gt yr−1 to −314 ± 23"; "548 ± 120 Gt yr−1 ... in 2023". | U3 | |
| chapter-1.md:39 | Regional 2%-39%; Central Europe values | OK | "between 2% and 39%"; Table 1 Central Europe −2.0 ± 0.1; −1.06 ± 0.04. | U3 | |
| chapter-1.md:41-45 | Central Asia, South Asia West, South Asia East values | OK | Table 1 values match. | U3 | |
| chapter-1.md:47 | South Asia West increase; regional shares | OK | "Alaska (22%)", "the Canadian Arctic (20%)", "(13%)", "(10%)". | U3 | Source gives "(20%)", not "about". |
| chapter-1.md:51 | Eleven regions; decline due to climate change (*very high confidence*) | OK | "glaciers (very high confidence) ... due to climate change in recent decades"; exclusions list. | S p.3, p.12 | |
| chapter-1.md:51 | *very likely* atmospheric warming is the primary driver | TOO_CLOSE | "It is very likely that atmospheric warming is the primary driver for the global glacier recession" | S p.12 | 9-word run. Term correct. |
| chapter-1.md:53 | *very likely* −490 ± 100; *likely* most negative below −850 in southern Andes, Caucasus, Alps and Pyrenees; HMA −150 ± 110 | OK | "was very likely -490 ± 100"; "were likely most negative (less than -850 ...)"; "(-150 ± 110 ...) but variations within regions are strong". | S p.3 | *likely* is in the Executive Summary (p.3) only. |
| chapter-1.md:59-61 | 2025: 408 ± 132 Gt; six in seven; regional per-area loss; anomalies; contributions | OK | "regional area-averaged mass loss was largest in Western Canada and USA, Iceland, and Central Europe"; "largest from High Mountain Asia, Alaska, and the Russian Arctic". | U4 | |
| chapter-1.md:63 | Reference glaciers 2024/25 among five most negative; 155 of ~170; Iceland, Pacific coast | OK | "among the five lowest glacier mass balances on record (1950-2025) and less negative than the record loss in 2022/2023"; "155 of the ~170 glaciers". | WMO p.16 | |
| chapter-1.md:63 | Eight of ten most negative since 1950 since 2016 | TOO_CLOSE | Same sentence as summary.md:18. | WMO p.16 | 8-word run. |
| chapter-1.md:67 | 25.3 ± 1.7 mm, 0.5 ± 0.2 mm/yr | OK | "contributing 25.3 ± 1.7 mm (0.5 ± 0.2 mm per year)". | U2 | |
| chapter-1.md:69 | 18 ± 1 mm; 0.75 ± 0.04 mm/yr; 2023 1.51 ± 0.33 mm | OK | "548 ± 120 Gt yr−1 (or 1.51 ± 0.33 mm yr−1) in 2023". | U3 | |
| chapter-1.md:69 | 2002-2021: 0.72 ± 0.04 mm/yr, about 20% | OVERSTATED | Denominator is "(2003–2016: 3.64 ± 0.26 mm yr−1)". | U3 | Period mismatch. |
| chapter-1.md:69 | Greenland 0.62 ± 0.06 mm/yr, about 17% | OK | "0.62 ± 0.06 mm yr−1 (17%)". | U3 | Same denominator caveat. |
| chapter-1.md:69 | 18% larger than Greenland; more than twice Antarctica | TOO_CLOSE | "about 18% larger than the loss from the Greenland Ice Sheet"; "more than twice the loss from the Antarctic Ice Sheet". | U3 | Runs of 11 and 9 words. Source applies it to 2002-2021. |
| chapter-1.md:71 | WMO: about 21% of sea-level rise 1993-2018 | OK | "contributed around 21% of the total sea-level rise over the period 1993–2018". | WMO p.17 | |
| chapter-1.md:73 | 2025: 1.1 ± 0.4 mm; cumulative 26.4 ± 3.3 mm | OK | "1.1 ± 0.4 mm"; "26.4 ± 3.3 mm". | U4 | |
| chapter-1.md:75 | SROCC 0.34 ± 0.07 mm/yr | OK | Table 2A.1. | S p.72 | |
| chapter-2.md:11 | Thame: moraine dams of two lakes failed | OK | Wave "eroded its moraine dam"; breach in the "end moraine". | U7 | |
| chapter-2.md:15 | GLOFs in most glaciated ranges; among most far-reaching hazards | OK | "documented for most glacierised mountain ranges and are among the most far-reaching glacier hazards". | S p.31 | |
| chapter-2.md:15 | Tens to hundreds of kilometres downstream | TOO_CLOSE | "Past events affected areas tens to hundreds of kilometres downstream" | S p.31 | 8-word run. |
| chapter-2.md:15 | Lakes held by moraines or glacier ice | OK | "moraine-dammed glacier lake outburst floods"; ice dams "causing particularly large floods once the ice dams breached". | S p.31 | Ice dams in the source hold rivers and lake sections. |
| chapter-2.md:17 | Lakes increased (*high confidence*) | TOO_CLOSE | "The number and area of glacier lakes has increased in most regions in recent decades (high confidence)" | S p.3 | One-word substitutions. |
| chapter-2.md:17 | Only *limited evidence* on GLOF frequency | TOO_CLOSE | "there is only limited evidence that the frequency of glacier lake outburst floods (GLOF) has changed" | S p.3 | |
| chapter-2.md:17 | Trends not well known; inventories may miss floods | TOO_CLOSE | "trends in the number of glacier-related floods are not well known for recent decades"; "inventories might significantly underestimate the number of events". | S p.31 | |
| chapter-2.md:17 | Himalaya: no increase in GLOFs since late 1980s | OK | "Veh et al. (2019) found no increase in the number of glacier lake outburst floods since the late 1980s". | S p.31 | 7-word run, at the limit. |
| chapter-2.md:17 | Permafrost thaw and buried ice made dams less stable | TOO_CLOSE | "The degradation of permafrost and the melting of ice buried in lake dams have been shown to lower dam stability" | S p.31 | 10-word run. |
| chapter-2.md:19 | Lakes will continue to increase (*high confidence*) | TOO_CLOSE | "the number and area of glacier lakes will continue to increase in most regions in the coming decades" | S p.31 | 12-word run. |
| chapter-2.md:19 | New lakes closer to unstable rock walls | OK | "new lakes will develop closer to steep and potentially unstable mountain walls". | S p.31 | |
| chapter-2.md:23 | Exposure increased and expected to continue (*high confidence*) | TOO_CLOSE | "the exposure of people and infrastructure to cryosphere hazards in high mountain regions has increased over recent decades, and this trend is expected to continue" | S p.32 | About 24 verbatim words. |
| chapter-2.md:23 | Tourism and hydropower drivers | OK | "tourism development has increased exposure"; "expansion of hydropower ... is another key factor". | S p.32 | |
| chapter-2.md:23 | Himalaya hydropower two-thirds | TOO_CLOSE | See summary.md:46. | S p.32 | |
| chapter-2.md:25 | GLOF deaths: 400 Europe, 5,745 South America, 6,300 Asia | TOO_CLOSE | "directly caused at least 400 deaths in Europe, 5,745 deaths in South America, and 6,300 deaths in Asia" | S p.33 | Numbers correct. 8-word run. |
| chapter-2.md:25 | A few large events dominate; Nepal and Bhutan | OK | "heavily skewed by individual large events"; "greatest in Nepal and Bhutan". | S p.33 | |
| chapter-2.md:29 | HKH >25,000 lakes; Nepal >90 GLOFs; Everest five events incl. Dig Tsho 1985 | OK | "over 25,000 glacial lakes"; "over 90 GLOFs since the early 1920s"; "five significant events in less than 50 years". | U8 | |
| chapter-2.md:29 | Dig Tsho damaged a hydropower plant, losses 500 million USD | TOO_CLOSE | "damaged a hydropower plant and other properties, with estimated economic losses of 500 million USD" | S p.33 | Fact correct. |
| chapter-2.md:35 | Slopes less stable (*high confidence*) | TOO_CLOSE | "Glacier retreat and permafrost thaw have decreased the stability of mountain slopes" | S p.3 | |
| chapter-2.md:35 | Rock fall in degrading permafrost (*high confidence*) | TOO_CLOSE | "within zones of degrading permafrost over the past half-century" | S p.28 | 8-word run. |
| chapter-2.md:35 | Field evidence and theory; retreat destabilised slopes, years to millennia (*high confidence*); statistics lacking | OK | "Available field evidence agrees with theoretical considerations"; "over time scales from years to millennia, but robust statistics ... are lacking". | S p.28, p.29 | |
| chapter-2.md:37 | Ice break-off natural, no trend detectable; basal warming (*medium evidence, high agreement*) | OK | "The few available observations are insufficient to detect trends"; "medium evidence and high agreement". | S p.29 | |
| chapter-2.md:39 | Glacier collapse 10-100 million m³, 200-300 km/h; Kolka 2002 ~130 deaths; Aru 2016 9 deaths; attribution | OK | "10–100 million m3"; "up to 200–300 km/h"; "Kolka Glacier, ~130 fatalities"; "twin glacier collapses with 9 fatalities"; "no evidence that climate change has played a direct role in the 2002 event". | S p.29 | |
| chapter-2.md:43 | Cascades; *limited evidence*; *high confidence* of new events | OK | "a combination or chain of processes"; "There is limited evidence of observed direct event chains"; "will also emerge where there is no record of previous events (high confidence)". | S p.32, p.4 | |
| chapter-2.md:45 | Blatten a hazard cascade; Thame a chain; both began with rock failure | OK | "this remarkable hazard cascade"; "starting with a rock avalanche into Upper Ngole Cho". | U5, U7 | |
| chapter-2.md:51 | Blatten setting; deformation two weeks before; ~4 million m³ on Birch Glacier | OK | "Blatten (Valais, Switzerland)"; "around two weeks before"; "around 4 million m3 of rock". | U5, U6 | |
| chapter-2.md:53 | Collapse 28 May; >9 million m³, 3:1 rock to ice; ~10 million m³ two phases; up to 32 m | OK | "over 9 million m3"; "approximately 10 million cubic meters"; "two-phase debris-ice avalanche"; "as thick as 32 m". | U5, U6 | |
| chapter-2.md:55 | Avalanche blocked the Lonza | OK | "dammed the Lonza". | U5 | |
| chapter-2.md:55 | Lake "flooded further parts of the village" | OVERSTATED | "led to the formation of a lake that damaged additional parts of the village" | U5 | Source says "damaged". |
| chapter-2.md:55 | Water later flowed out and cut a new river bed | CANNOT_VERIFY | U6 lists "river damming", "lake formation up-valley", "formation of a new river bed"; mechanism not stated. | U6 | Tried U5 and U6. |
| chapter-2.md:59 | Village destroyed; evacuated; one life (U5); loss of life avoided (U6) | OK | "completely evacuated"; "claiming one life"; "could be evacuated in time"; "avoided loss of life". | U5, U6 | |
| chapter-2.md:65 | Bellwald: rock faces "very likely" permafrost-affected; not IPCC calibrated | OK | "very likely were affected by the presence of permafrost". | U6 | |
| chapter-2.md:65 | Melting permafrost and hydrostatic pressure "most likely" main causes | OVERSTATED | "The unfavourable geology in combination with melting permafrost" (increased hydrostatic pressures) "most likely the main causes" | U6 | Omits unfavourable geology. Same in faq.md:26. |
| chapter-2.md:65 | Rain on 28 May saturated debris; runout; roles debated | OK | "saturating the collapsed debris"; "partly explaining the runout"; "still debated". | U6 | |
| chapter-2.md:67 | Jacquemart et al. aims; no conclusion; glacier history 1946-2023 | OK | "to evaluate the relevance of human-caused climate change"; "(1946-2023)"; "surge-type acceleration". | U5 | |
| chapter-2.md:75 | Thame, 16 Aug 2024; two lakes ~10 km upstream | OK | "about 10 km upstream"; "August 16, 2024". | U7, U8 | |
| chapter-2.md:77 | Rock avalanche into Upper Ngole Cho; 4,900 m; 156,000 m³; 120 m drop | OK | "a glacial lake at 4,900 metres"; "156,000 cubic metres"; "fell 120 metres". | U8, U7 | Lake name only in U7; link to "4,900 m" inferred from sequence. |
| chapter-2.md:79 | Breach up to 22 m deep and 51 m wide | WRONG | "eroded up to 22 m in height and 51 m in width" | U7 | Source says height, not depth. |
| chapter-2.md:79 | Lower Ngole Cho 303,000 m³; total 459,000 m³ | OK | "303,000 cubic metres"; "459,000 cubic metres". | U8 | |
| chapter-2.md:81 | Hyper-concentrated flow; >80 km; Thyanbo ponding; valley floor | OK | "hyper-concentrated flow"; "80km downstream"; "Thyanbo outwash plain"; "half-a-kilometre wide valley floor". | U7, U8 | |
| chapter-2.md:85 | 135 displaced; 25 homes; damage list; ground less stable | OK | "135 people and destroying 25 homes"; "farmland, hotels, schools, and hydropower facilities"; "land subsidence, and tension cracks". | U8, U7 | |
| chapter-2.md:87 | No deaths: daylight and phased arrival | OK | "in daylight and phased nature of the flood". | U8 | |
| chapter-2.md:91 | Maharjan: climate-driven; geology and landforms; smaller lakes | OK | "intensified the impact of this climate-driven event"; "even the relatively smaller lakes". | U8 | Attributed to him only. |
| chapter-2.md:93-97 | Lake risk ratings | OK | "remains highly vulnerable"; "high risk due to unstable ice-dammed conditions"; "moderate risk". | U7 | Text "exposed", source "vulnerable". |
| chapter-2.md:101 | Both started with rock failure; Thame two lakes | OK | See chapter-2:45, :77. | U5, U7 | |
| chapter-2.md:101 | At Blatten, rock loading led to the collapse | OVERSTATED | U5 describes the "effect of the rock loading" as something to reconstruct; no result stated. | U5 | Causal claim beyond the source. |
| chapter-2.md:101 | Most damaging effects well below the starting point in both cases | OVERSTATED | No source ranks the damage by location. | U6, U7 | The report's own synthesis. |
| chapter-3.md:11 | 500 glaciers, 0.2%; 96%; open access with citation | OK | "approximately 500 glaciers"; "Open access under the requirement of correct citation." | U2, U1 | |
| chapter-3.md:11 | 96% "over periods of several years" | CANNOT_VERIFY | Abstract says "decadal". | U2 | |
| chapter-3.md:13 | GlaMBIE gravimetry exclusions | OK | Excluded "for Central Asia, South Asia east and South Asia west". | U3 | |
| chapter-3.md:13 | Combined estimate drew on 233 estimates | WRONG | "195 ... were used to compute our combined estimates" (38 excluded). | U3 | 195, not 233. |
| chapter-3.md:15 | Observation gaps; ice volumes; cloud and terrain; citizen science, Indigenous and local knowledge; weather information lacking | OK | "limited spatial density and/or temporal extent"; "current glacier ice volumes"; "Fundamental weather and climate information is lacking". | S p.44, p.33 | |
| chapter-3.md:21 | Early warning: engagement, preparation, sustainability | OK | "strong local engagement and capacity building"; "long-term sustainability". | S p.33 | |
| chapter-3.md:21 | Pakistan and Chile: warnings, evacuation, relief community-led | TOO_CLOSE | "In Pakistan and Chile, for instance, glacier flood warnings, evacuation and post-disaster relief have largely been community led" | S p.33 | |
| chapter-3.md:23 | Warning systems at Laguna 513 and Palcacocha | TOO_CLOSE | "Early warning systems have been, or are being, installed at glacial lakes Laguna 513 and Palcacocha" | S p.34 | |
| chapter-3.md:23 | Laguna 513 lowered 20 m; 2010 flood; system destroyed 2017; education | OK | "lowered by 20 m ... in the early 1990s"; "some local residents destroyed it in 2017". | S p.34 | "After 2010" renders "subsequently". |
| chapter-3.md:27-29 | Blatten monitoring and evacuation | OK | See chapter-2:51-59. | U5, U6 | |
| chapter-3.md:33 | Reconstruction data; Elmer/Ice | OK | "aerial topographic surveys, radar and time-lapse images"; "the 3-D finite element model Elmer/Ice". | U5 | |
| chapter-3.md:37 | Thame: no source on warning; no deaths explained | OK | Record: warning "Not stated"; press: daylight and phases. | U7, U8 | |
| chapter-3.md:41 | Recommendations: stations, early warning, satellite imagery; real-time stations | OK | "Install hydrological and meteorological stations"; "high-resolution satellite imagery"; "real-time information". | U7, U8 | |
| chapter-3.md:41 | ICIMOD calls for monitoring across the HKH | CANNOT_VERIFY | Only the call for monitoring stations found; "across the HKH" not found. | U8 | Tried U8 twice. |
| chapter-3.md:43 | NDRRMA and ICIMOD investigation; methods; partners | OK | "conducted a field investigation"; "satellite analysis, drone surveys"; "Sagarmatha Pollution Control Committee". | U7, U8 | |
| chapter-3.md:49-54 | SROCC four adaptation strategies | TOO_CLOSE | "hazard and risk mapping as a basis for land zoning and early warning systems that reduce potential exposure; various community level interventions ..." | S p.33 | 9-word run; follows the source's order and wording. |
| chapter-3.md:56 | Tsho Rolpa 3 million USD; Imja Tsho 2016; reactive; scarce | OK | "cost 3 million USD in 2000"; "Imja Tsho Lake in Nepal in 2016". | S p.33 | |
| chapter-3.md:58 | Effective governance ... planning, zoning, urbanisation (*medium confidence*) | TOO_CLOSE | "Effective governance is a key enabler for reducing disaster risk, considering relevant exposure factors such as planning, zoning, and urbanisation pressures" | S p.5 | Runs of 10 and 9 words. |
| chapter-3.md:58 | Integrative social-ecological perspective (*medium confidence*) | OK | "medium confidence that applying an integrative socioecological risk perspective ... paves the way". | S p.33 | |
| chapter-3.md:58 | Significant risk reduction needed (*high confidence*) | TOO_CLOSE | "vulnerability growing in the coming century, significant risk reduction and adaptation strategies will be required" | S p.33 | 10-word run. |
| chapter-3.md:62 | Blatten history since 1433; recurrence 2 and 16 years; no rock avalanches recorded | OK | "since at least 1433"; "2 and 16 years for the Lötschental Valley". | U6 | |
| chapter-3.md:64 | Geohazard map Nov 2025; Blatten 2.0; building land | OK | "has been updated in November 2025"; "build a safe Blatten 2.0"; "land for building available in moderated areas". | U6 | Text reads "moderated areas" as moderate hazard. |
| chapter-3.md:68 | Recommendations; structural plus non-structural; flood risk plan; ratings | OK | "Use ultra-high-resolution survey data"; "a long-term flood risk management plan". | U7, U8 | |
| chapter-3.md:74 | Thame ground unstable | OK | "Sediment deposition, severe erosion, land subsidence, and tension cracks". | U7 | |
| chapter-3.md:74-80 | Five "immediate measures" | OVERSTATED | Immediate measures in the record: "Fill and protect tension cracks, stabilise riverbanks, and channelise river flow". Bank protection and erosion control are under risk mitigation. | U7, U8 | Two of five bullets are not immediate measures. |
| chapter-3.md:82 | ICIMOD: act before events; science into policy | OK | "to translate cryospheric and disaster related science into actionable policy". | U8 | |
| chapter-3.md:86 | Return by 2029; willingness; timetable | OK | "return of residents by 2029"; "if time schedules are kept". | U6 | |
| chapter-3.md:92 | Recovery builds resilience; forward planning | OK | "opportunity to build new resilience"; "forward-thinking planning". | S p.34 | |
| chapter-3.md:92 | Kedarnath 2013 rebuilt in same exposed places | TOO_CLOSE | "guest houses and even schools were being rebuilt in the same exposed locations" | S p.34 | Near-verbatim. |
| chapter-3.md:92 | Combining knowledge most efficient for complex hazards (*high confidence*) | TOO_CLOSE | "is most efficient in addressing complex hazards and risks related to glaciers, snow, and permafrost" | S p.34 | Term correct. |
| chapter-3.md:96-100 | Case comparison | OK | Supported by U6, U7, U8 as cited. | U6, U7, U8 | |
| faq.md:10 | 273 ± 16, 6,542 ± 387, 5%; 408 ± 132 | OK | See summary.md:14, :18. | U3, U4 | |
| faq.md:14 | 500 glaciers; methods; WGMS combines | OK | As chapter-1:11. | U2, U3 | |
| faq.md:14 | 96% "usually over several years" | CANNOT_VERIFY | Abstract says "decadal". | U2 | |
| faq.md:18 | 18 ± 1 mm; 0.34 ± 0.07 mm/yr | OK | See summary.md:26. | U3; S p.72 | |
| faq.md:22 | GLOF explanation; terms | OK | "triggered by impact waves from snow-, ice- or rock-avalanches, landslides". | S p.31, p.32, p.3 | SROCC has no formal GLOF definition; plain paraphrase. |
| faq.md:26 | No source says climate change caused Blatten; roles debated | OK | Aim only; "still debated". | U5, U6 | |
| faq.md:26 | Author's "most likely" main causes | OVERSTATED | "The unfavourable geology in combination with melting permafrost" | U6 | Omits geology. |
| faq.md:30 | Early warning; Laguna 513; Blatten evacuation | OK | See chapter-3:21, :23, chapter-2:59. | S p.33, p.34; U6 | |
| glossary.md:10-22 | Ablation zone, accumulation zone, albedo, calving | OK | WMO glossary passages. | WMO p.16-17 | |
| glossary.md:26 | Cascading event | OK | "a combination or chain of processes". | S p.32 | No formal SROCC definition. |
| glossary.md:30 | Confidence: five qualifiers | TOO_CLOSE | "expressed using five qualifiers: very low, low, medium, high and very high, and typeset in italics" | S p.3 fn.1 | 10-word run, mostly a list of defined terms. |
| glossary.md:34 | Evidence and agreement terms | OK | "limited, medium, or robust; ... low, medium or high". | S p.3 | |
| glossary.md:38, 58 | Geodetic and glaciological methods | OK | "geodetic method (using elevation changes) and ... glaciological method". | S p.69; U2 | |
| glossary.md:42 | GLOF | OK | See chapter-2:15. | S p.31 | |
| glossary.md:46 | Glacier collapse | OK | "A rare type of glacier instability". | S p.29 | |
| glossary.md:50, 62, 70, 78 | Mass balance, hydrological year, m w.e., reference glaciers | OK | "expressed in metres water equivalent"; "(September–August)". | WMO p.16-17 | "Continuous" vs "ongoing". |
| glossary.md:54 | Glacier surge | OK | "quasi-periodic and substantial increases in glacier speed". | S p.29 | |
| glossary.md:66 | Likelihood terms | OK | "Very likely 90–100%, Likely 66–100%". | S p.3 fn.2 | |
| glossary.md:74, 82 | Moraine; rock fall and rock avalanche | OK | "Debris left behind by retreating glaciers (moraines)"; "rock avalanches, which have larger volumes". | S p.29, p.28 | |
| about.md:18 | "Every factual statement carries a citation"; "does not reproduce their wording" | OVERSTATED | Two uncited sentences (chapter-1:15, :21); 31 TOO_CLOSE passages. | n/a | |
| about.md:28-37 | Source list matches reference data | OK | All 10 entries match. | references.json | |
| about.md:41 | WGMS open access with citation | OK | "Open access under the requirement of correct citation." | U1 | |
| about.md:45 | ESSD CC licence; ICIMOD CC BY-NC-ND 4.0 | OK | "Creative Commons Attribution 4.0 License"; "CC BY-NC-ND 4.0". | U2, U7 | |
| about.md:45 | GlaMBIE under CC Attribution | CANNOT_VERIFY | No licence statement in the text read. | U3 | Tried Nature page and Europe PMC XML. |
| home.md:7 | 273 ± 16; six in seven | OK | See summary.md:10. | U3, U4 | |
| home.md:9 | Lakes; slopes (*high confidence*) | TOO_CLOSE | See summary.md:34. | S p.3 | |
| home.md:11 | Mapping, early warning, engineering; mostly reactive | OK | "mostly in the form of reactive responses". | S p.33 | |

## Notes from the verifier

- SROCC calibrated terms: every italic term matches SROCC's own term for that statement. The
  *likely* at chapter-1:53 is in the Executive Summary only. Bellwald's "very likely" and "most
  likely" (chapter 2.3.3) are correctly kept as his own words.
- Blatten and Thame: no attribution to climate change beyond the sources. Issues: omission of
  "unfavourable geology" (chapter-2:65, faq:26) and the causal claim at chapter-2:101.
- Open markers: TODO_SOURCE at chapter-2:61, chapter-3:31, :39, :88; TODO_FIGURE at
  chapter-1:29, :55; "TODO: contact details" at about.md:53.
