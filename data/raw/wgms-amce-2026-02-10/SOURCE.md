# Source of the files in this folder

The report uses original files, unchanged, from the WGMS annual mass-change estimates, version
2026-02-10. They are **not in the repository**: the dataset terms (below) allow open access with
correct citation but do not state that the files may be redistributed. They are kept locally in
this folder and ignored by git. Only the processed file `data/glacier-mass-change.csv` is
committed.

To rebuild the processed file: download the zip below, check its SHA-256, unzip the files listed
under "Files used" into this folder (keeping `region/`), and run `npm run data`, which checks the
SHA-256 of each file against `data/processing.json`.

- Creator: World Glacier Monitoring Service (WGMS)
- Title: Annual mass-change estimates for the world's glaciers (version 2026-02-10)
- Publisher (as given on the landing page): World Glacier Monitoring Service (WGMS) and
  Copernicus Climate Change Service (C3S)
- Release date: 2026-02-10
- DOI: https://doi.org/10.5904/wgms-amce-2026-02-10
- Landing page: https://wgms.ch/mass_change_estimates/
- Download: https://wgms.ch/downloads/wgms-amce-2026-02-10.zip (53,589,520 bytes),
  downloaded on 25 November 2026
- SHA-256 of the zip file: b88c2355650142160594c96dcb800e3fb58d82abbebd0ab2d976a458153e2ecc
- Rights, as stated on the landing page: "Open access under the requirement of correct
  citation"

## Citation

As given in the dataset README:

> WGMS (2026): Annual mass-change estimates for the world's glaciers. Individual glacier time
> series and gridded data products. Digital media. https://doi.org/10.5904/wgms-amce-2026-02-10

Related publication describing the method:

> Dussaillant, I., Hugonnet, R., Huss, M., Berthier, E., Bannwart, J., Paul, F., and Zemp, M.
> (2025): Annual mass change of the world's glaciers from 1976 to 2024 by temporal downscaling
> of satellite data with in-situ observations. Earth System Science Data 17(5): 1977-2006.
> https://doi.org/10.5194/essd-17-1977-2025

## Files used

Only these files of the archive are used (the full archive, with the glacier-level files and the
gridded NetCDF file, is 489 MB unpacked).

| File | SHA-256 |
| --- | --- |
| README.md | 148e2236dcf8851350b40a3f7b491d9c1eb4f4c8f5624b0125c63e5eeff2b50d |
| global.csv | 73af0a84be3c9aa10131494175e7c2e115ff44f22141992505cd9373497eca35 |
| region/CEU.csv (Central Europe) | 256d01e8842c5591855f5c5a1e7df5e26554e2041f294475843f1c310d6f9892 |
| region/ASC.csv (Central Asia) | d63f583ada5371292861f99d90f93701fc9056fba617bab6aab179debf107357 |
| region/ASW.csv (South Asia West) | 556539b91236991e7f0dc622aec800423574e8bf9e7ac1aa6db1d068fdeb1282 |
| region/ASE.csv (South Asia East) | df1a2223682a34431ceef603b929942dfbca5d131dda20d9bf7b46ee28e0e3fe |
| region/SA1.csv (Southern Andes, Patagonia) | 60328a373141cff2816e85ff2c76b52327b6440fd9dcb3cc6d1511fabe5814d1 |
| region/SA2.csv (Southern Andes, Central) | 3f39197571b6939591ad20a1e871cb6d3dfaf6227680596a8c156edd24c3e918 |

The dataset splits the Southern Andes into two subregions (SA1 Patagonia, SA2 Central). They are
kept as two series; no combined Southern Andes series is derived, because the dataset gives no
combined uncertainty.

All `*_sigma` columns are 1-sigma uncertainties (dataset README). Units: Gt (gigatonnes) and
m w.e. (metres water equivalent). Years are hydrological years, labelled by their end year.

The processed file `data/glacier-mass-change.csv` is made from these files by
`scripts/data/process-wgms.ts` (`npm run data`).
