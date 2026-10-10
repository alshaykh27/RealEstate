// =============================================================================
// Darvia — Phase 3 verification (anonymous / anon key only)
// -----------------------------------------------------------------------------
// Usage:  node scripts/verify-phase-3.mjs   (or: npm run verify:phase3)
//
// Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from
// .env.local. It NEVER prints those values. Run it AFTER you have pasted the
// Phase 3 migration into a fresh project.
//
// It checks, through the public REST + Storage APIs with the anon key:
//   * published rows are readable; drafts are not
//   * INSERT / UPDATE / DELETE are rejected on every table
//   * profiles and inquiries are not readable
//   * Storage rejects anonymous uploads (incl. oversize and wrong MIME type)
// =============================================================================

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal(path) {
  const out = {};
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return out;
  }
  for (const rawLine of text.split(/\r?\n/)) {
    const m = rawLine.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let value = m[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[m[1]] = value;
  }
  return out;
}

const env = { ...loadEnvLocal(join(root, ".env.local")), ...process.env };
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || "";
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !ANON_KEY) {
  console.error(
    "FAIL: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY are missing from .env.local.",
  );
  process.exit(2);
}

const REST = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1`;
const STORAGE = `${SUPABASE_URL.replace(/\/+$/, "")}/storage/v1`;

const SEED_PROP = "00000000-0000-4000-b000-000000000001";
const DRAFT_SLUG = "sample-draft-unpublished";
const AREA_ID = "00000000-0000-4000-a000-000000000001";

const results = [];
function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
}
async function check(name, fn) {
  try {
    const { pass, detail } = await fn();
    record(name, pass, detail);
  } catch (err) {
    record(name, false, `threw: ${err && err.message ? err.message : err}`);
  }
}

async function req(method, url, { headers, body } = {}) {
  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

const anon = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, Accept: "application/json" };
const anonJson = { ...anon, "Content-Type": "application/json" };

const rows = (d) => (Array.isArray(d) ? d.length : 0);

// --- Public reads ------------------------------------------------------------
await check("site_settings readable by anon", async () => {
  const r = await req("GET", `${REST}/site_settings?select=id,brand_name_en&limit=1`, {
    headers: anon,
  });
  return { pass: r.ok && rows(r.data) === 1, detail: `status ${r.status}, rows ${rows(r.data)}` };
});

await check("areas readable by anon", async () => {
  const r = await req("GET", `${REST}/areas?select=id,slug&limit=50`, { headers: anon });
  return { pass: r.ok && rows(r.data) >= 1, detail: `status ${r.status}, rows ${rows(r.data)}` };
});

await check("published properties readable by anon", async () => {
  const r = await req("GET", `${REST}/properties?select=slug&is_published=eq.true&limit=100`, {
    headers: anon,
  });
  return { pass: r.ok && rows(r.data) >= 1, detail: `status ${r.status}, rows ${rows(r.data)}` };
});

await check("draft property NOT readable by anon", async () => {
  const r = await req("GET", `${REST}/properties?select=slug&limit=100`, { headers: anon });
  const slugs = Array.isArray(r.data) ? r.data.map((x) => x.slug) : [];
  const leaked = slugs.includes(DRAFT_SLUG);
  return {
    pass: r.ok && !leaked,
    detail: leaked ? "DRAFT LEAKED to anon" : `status ${r.status}, draft hidden`,
  };
});

await check("draft not returned by explicit slug query", async () => {
  const r = await req("GET", `${REST}/properties?select=slug&slug=eq.${DRAFT_SLUG}`, {
    headers: anon,
  });
  return { pass: r.ok && rows(r.data) === 0, detail: `status ${r.status}, rows ${rows(r.data)}` };
});

await check("property_images of published properties readable by anon", async () => {
  const r = await req("GET", `${REST}/property_images?select=id&limit=5`, { headers: anon });
  return { pass: r.ok && rows(r.data) >= 1, detail: `status ${r.status}, rows ${rows(r.data)}` };
});

await check("property_slug_history readable by anon", async () => {
  const r = await req("GET", `${REST}/property_slug_history?select=id&limit=1`, { headers: anon });
  return { pass: r.ok, detail: `status ${r.status}, rows ${rows(r.data)}` };
});

await check("profiles NOT readable by anon", async () => {
  const r = await req("GET", `${REST}/profiles?select=id,is_admin&limit=5`, { headers: anon });
  return {
    pass: !r.ok || rows(r.data) === 0,
    detail: `status ${r.status}, rows ${rows(r.data)}`,
  };
});

await check("inquiries not exposed (no inquiry table by design)", async () => {
  const r = await req("GET", `${REST}/inquiries?select=id&limit=1`, { headers: anon });
  return {
    pass: r.status === 404 || (r.ok && rows(r.data) === 0),
    detail: `status ${r.status}`,
  };
});

// --- Writes rejected for anon -----------------------------------------------
const insertBodies = {
  areas: { slug: "anon-should-fail", name_en: "x", description_en: "x" },
  properties: {
    slug: "anon-should-fail",
    property_type: "apartment",
    listing_type: "sale",
    title_en: "x",
    description_en: "x",
    address_en: "x",
    price: 1,
  },
  property_images: {
    property_id: SEED_PROP,
    storage_path: "anon/should-fail.webp",
    alt_en: "x",
    size_bytes: 10,
  },
  property_slug_history: { property_id: SEED_PROP, old_slug: "anon-should-fail-slug" },
  site_settings: { id: 99, brand_name_en: "x", hero_headline_en: "x", hero_subhead_en: "x" },
  profiles: { id: "00000000-0000-0000-0000-0000000000ff" },
};

for (const [table, body] of Object.entries(insertBodies)) {
  await check(`anon INSERT rejected: ${table}`, async () => {
    const r = await req("POST", `${REST}/${table}`, {
      headers: { ...anonJson, Prefer: "return=representation" },
      body: JSON.stringify(body),
    });
    return { pass: r.status >= 400, detail: `status ${r.status}` };
  });
}

const updateTargets = {
  areas: { filter: `id=eq.${AREA_ID}`, patch: { name_en: "anon-hacked" } },
  properties: { filter: `id=eq.${SEED_PROP}`, patch: { title_en: "anon-hacked" } },
  property_images: {
    filter: `property_id=eq.${SEED_PROP}`,
    patch: { alt_en: "anon-hacked" },
  },
  property_slug_history: { filter: "old_slug=eq.__none__", patch: { old_slug: "anon-hacked" } },
  site_settings: { filter: "id=eq.1", patch: { brand_name_en: "anon-hacked" } },
  profiles: {
    filter: "id=eq.00000000-0000-0000-0000-0000000000ff",
    patch: { is_admin: true },
  },
};

for (const [table, { filter, patch }] of Object.entries(updateTargets)) {
  await check(`anon UPDATE rejected: ${table}`, async () => {
    const r = await req("PATCH", `${REST}/${table}?${filter}`, {
      headers: { ...anonJson, Prefer: "return=representation" },
      body: JSON.stringify(patch),
    });
    const affected = rows(r.data);
    return {
      pass: r.status >= 400 || affected === 0,
      detail: `status ${r.status}, rows ${affected}`,
    };
  });
}

for (const [table, { filter }] of Object.entries(updateTargets)) {
  await check(`anon DELETE rejected: ${table}`, async () => {
    const r = await req("DELETE", `${REST}/${table}?${filter}`, {
      headers: { ...anonJson, Prefer: "return=representation" },
    });
    const affected = rows(r.data);
    return {
      pass: r.status >= 400 || affected === 0,
      detail: `status ${r.status}, rows ${affected}`,
    };
  });
}

// --- Storage: anonymous upload must be rejected ------------------------------
async function tryUpload(path, contentType, bytes) {
  const res = await fetch(`${STORAGE}/object/property-images/${path}`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": contentType,
      "x-upsert": "false",
    },
    body: bytes,
  });
  const text = await res.text().catch(() => "");
  return { status: res.status, ok: res.ok, message: text.slice(0, 160) };
}

const smallWebp = new Uint8Array(1024);
const oversizeWebp = new Uint8Array(3 * 1024 * 1024 + 1); // > 3 MiB

await check("storage rejects anonymous upload (valid webp)", async () => {
  const r = await tryUpload("verify/anon-small.webp", "image/webp", smallWebp);
  return { pass: !r.ok, detail: `status ${r.status}${r.ok ? " (UPLOADED!)" : ""}` };
});

await check("storage rejects anonymous oversize upload (>3 MiB)", async () => {
  const r = await tryUpload("verify/anon-big.webp", "image/webp", oversizeWebp);
  return { pass: !r.ok, detail: `status ${r.status}${r.ok ? " (UPLOADED!)" : ""}` };
});

await check("storage rejects anonymous wrong MIME type (text/plain)", async () => {
  const r = await tryUpload("verify/anon-wrong.bin", "text/plain", smallWebp);
  return { pass: !r.ok, detail: `status ${r.status}${r.ok ? " (UPLOADED!)" : ""}` };
});

// --- Report ------------------------------------------------------------------
console.log("");
console.log("Phase 3 verification (anon key)");
console.log("---------------------------------------------");
let failed = 0;
for (const { name, pass, detail } of results) {
  if (!pass) failed++;
  const tag = pass ? "PASS" : "FAIL";
  console.log(`${tag}  ${name}${detail ? `  [${detail}]` : ""}`);
}
console.log("---------------------------------------------");
console.log(`${results.length - failed} passed, ${failed} failed`);
console.log("");
console.log("Note: oversize / wrong-MIME specifics may be masked because anonymous uploads");
console.log("are already blocked by RLS. To isolate the 3 MiB and MIME checks, re-run those");
console.log("two as an authenticated admin after you create the admin user.");

process.exit(failed === 0 ? 0 : 1);
