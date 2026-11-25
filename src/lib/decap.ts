// The pinned Decap CMS build loaded by the admin pages. One place for the version and the
// Subresource Integrity hash (sha384 of the exact file at DECAP_URL). To upgrade: change the
// version, download the file, compute `openssl dgst -sha384 -binary decap-cms.js | openssl base64 -A`.
// Pure constants, no imports, so scripts/check.ts can load it.

export const DECAP_VERSION = "3.18.0";
// Written out in full (not built from the version) so that scripts/check.ts can match it exactly.
export const DECAP_URL = "https://unpkg.com/decap-cms@3.18.0/dist/decap-cms.js";
export const DECAP_INTEGRITY = "sha384-Vu0vdYOBhK+2KywHCtNZ9sCqpzkwx358AT6pCSg8om/clLoDzpWYF41jrtEk/WMM";
