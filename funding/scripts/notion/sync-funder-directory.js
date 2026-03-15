#!/usr/bin/env node

/**
 * Sync Funder Directory — query funder relationships from Notion
 *
 * Usage:
 *   node sync-funder-directory.js                          # All funders
 *   node sync-funder-directory.js --relationship=Active    # Filter
 *   node sync-funder-directory.js --type=Corporate         # Filter by type
 *   node sync-funder-directory.js --save                   # Save to reports/
 */

import { queryDatabase } from "../../../automations/scripts/utils/notion-client.js";
import { log, error } from "../../../automations/scripts/utils/logger.js";
import { writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

function getArg(name) {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split("=")[1] : null;
}

const relationshipFilter = getArg("relationship");
const typeFilter = getArg("type");
const shouldSave = args.includes("--save");

const DB_ID = process.env.NOTION_FUNDER_DIRECTORY_DB_ID;

if (!DB_ID) {
  console.error("Error: NOTION_FUNDER_DIRECTORY_DB_ID not set in environment");
  process.exit(1);
}

async function main() {
  log("sync-funder-directory:start", { relationshipFilter, typeFilter });

  const filter = buildFilter(relationshipFilter, typeFilter);
  const pages = await queryDatabase(DB_ID, filter);
  const funders = pages.map(parseFunder);

  console.log("\n=== WBB Funder Directory ===\n");
  console.log(`Total funders: ${funders.length}`);

  const byRelationship = groupBy(funders, "relationship");
  console.log("\nBy Relationship:");
  for (const [rel, items] of Object.entries(byRelationship)) {
    console.log(`  ${rel}: ${items.length}`);
  }

  console.log("\n--- Funders ---\n");
  for (const funder of funders) {
    console.log(`${funder.name} (${funder.type})`);
    console.log(`  Relationship: ${funder.relationship}`);
    console.log(`  Focus: ${funder.focusAreas.join(", ") || "N/A"}`);
    console.log(`  Program Fit: ${funder.programFit.join(", ") || "N/A"}`);
    console.log(`  Typical Size: ${funder.typicalSize || "N/A"}`);
    console.log(`  Past Funding: $${(funder.pastFunding || 0).toLocaleString()}`);
    console.log(`  Last Contact: ${funder.lastContact || "N/A"}`);
    console.log("");
  }

  if (shouldSave) {
    const outPath = resolve(__dirname, "../../reports", `funder-directory-${Date.now()}.json`);
    await writeFile(outPath, JSON.stringify(funders, null, 2));
    console.log(`Saved to: ${outPath}`);
  }

  log("sync-funder-directory:complete", { count: funders.length });
}

function buildFilter(relationship, type) {
  const conditions = [];
  if (relationship) {
    conditions.push({ property: "Relationship", select: { equals: relationship } });
  }
  if (type) {
    conditions.push({ property: "Type", select: { equals: type } });
  }
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return { and: conditions };
}

function parseFunder(page) {
  const p = page.properties;
  return {
    id: page.id,
    name: p["Funder Name"]?.title?.[0]?.plain_text || "",
    type: p["Type"]?.select?.name || "",
    relationship: p["Relationship"]?.select?.name || "",
    focusAreas: p["Focus Areas"]?.multi_select?.map((s) => s.name) || [],
    programFit: p["Program Fit"]?.multi_select?.map((s) => s.name) || [],
    typicalSize: p["Typical Grant Size"]?.select?.name || "",
    website: p["Website"]?.url || "",
    contact: p["Contact"]?.rich_text?.[0]?.plain_text || "",
    pastFunding: p["Past Funding"]?.number || 0,
    lastContact: p["Last Contact"]?.date?.start || null,
    notes: p["Notes"]?.rich_text?.[0]?.plain_text || "",
  };
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const val = item[key] || "Unknown";
    if (!acc[val]) acc[val] = [];
    acc[val].push(item);
    return acc;
  }, {});
}

main().catch((err) => {
  error("sync-funder-directory:error", err);
  process.exit(1);
});
