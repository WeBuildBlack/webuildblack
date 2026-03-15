#!/usr/bin/env node

/**
 * Sync Grant Tracker — query the grant pipeline from Notion
 *
 * Usage:
 *   node sync-grant-tracker.js                    # All grants
 *   node sync-grant-tracker.js --status=Qualified # Filter by status
 *   node sync-grant-tracker.js --program=fast-track # Filter by program
 *   node sync-grant-tracker.js --save             # Save to reports/
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

const statusFilter = getArg("status");
const programFilter = getArg("program");
const shouldSave = args.includes("--save");

const DB_ID = process.env.NOTION_GRANT_TRACKER_DB_ID;

if (!DB_ID) {
  console.error("Error: NOTION_GRANT_TRACKER_DB_ID not set in environment");
  process.exit(1);
}

async function main() {
  log("sync-grant-tracker:start", { statusFilter, programFilter });

  const filter = buildFilter(statusFilter, programFilter);
  const pages = await queryDatabase(DB_ID, filter);
  const grants = pages.map(parseGrant);

  // Summary
  const summary = {
    total: grants.length,
    byStatus: groupBy(grants, "status"),
    totalValue: grants.reduce((sum, g) => sum + (g.amount || 0), 0),
  };

  console.log("\n=== WBB Grant Pipeline ===\n");
  console.log(`Total opportunities: ${summary.total}`);
  console.log(`Total pipeline value: $${summary.totalValue.toLocaleString()}`);
  console.log("\nBy Status:");
  for (const [status, items] of Object.entries(summary.byStatus)) {
    const value = items.reduce((sum, g) => sum + (g.amount || 0), 0);
    console.log(`  ${status}: ${items.length} ($${value.toLocaleString()})`);
  }

  console.log("\n--- Grants ---\n");
  for (const grant of grants) {
    console.log(`${grant.name}`);
    console.log(`  Funder: ${grant.funder} | Amount: $${(grant.amount || 0).toLocaleString()}`);
    console.log(`  Status: ${grant.status} | Deadline: ${grant.deadline || "N/A"}`);
    console.log(`  Programs: ${grant.programs.join(", ") || "N/A"}`);
    console.log(`  Score: ${grant.matchScore || "N/A"} | Priority: ${grant.priority || "N/A"}`);
    console.log("");
  }

  if (shouldSave) {
    const outPath = resolve(__dirname, "../../reports", `grant-pipeline-${Date.now()}.json`);
    await writeFile(outPath, JSON.stringify({ summary, grants }, null, 2));
    console.log(`Saved to: ${outPath}`);
  }

  log("sync-grant-tracker:complete", { count: grants.length });
}

function buildFilter(status, program) {
  const conditions = [];
  if (status) {
    conditions.push({ property: "Status", select: { equals: status } });
  }
  if (program) {
    const programName = program.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    conditions.push({ property: "Program Alignment", multi_select: { contains: programName } });
  }
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return { and: conditions };
}

function parseGrant(page) {
  const p = page.properties;
  return {
    id: page.id,
    name: p["Grant Name"]?.title?.[0]?.plain_text || "",
    funder: p["Funder"]?.select?.name || "",
    amount: p["Amount"]?.number || 0,
    deadline: p["Deadline"]?.date?.start || null,
    status: p["Status"]?.select?.name || "",
    programs: p["Program Alignment"]?.multi_select?.map((s) => s.name) || [],
    grantType: p["Grant Type"]?.select?.name || "",
    priority: p["Priority Score"]?.select?.name || "",
    effort: p["Effort Level"]?.select?.name || "",
    matchScore: p["Match Score"]?.number || null,
    url: p["URL"]?.url || "",
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
  error("sync-grant-tracker:error", err);
  process.exit(1);
});
