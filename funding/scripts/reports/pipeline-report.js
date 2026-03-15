#!/usr/bin/env node

/**
 * Pipeline Report — funding pipeline summary
 *
 * Usage:
 *   node pipeline-report.js            # Full pipeline summary
 *   node pipeline-report.js --save     # Save to reports/
 */

import { queryDatabase } from "../../../automations/scripts/utils/notion-client.js";
import { log, error } from "../../../automations/scripts/utils/logger.js";
import { writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const shouldSave = args.includes("--save");

const GRANT_DB = process.env.NOTION_GRANT_TRACKER_DB_ID;
const FUNDER_DB = process.env.NOTION_FUNDER_DIRECTORY_DB_ID;

if (!GRANT_DB) {
  console.error("Error: NOTION_GRANT_TRACKER_DB_ID not set in environment");
  process.exit(1);
}

async function main() {
  log("pipeline-report:start");

  const pages = await queryDatabase(GRANT_DB);
  const grants = pages.map(parseGrant);
  const now = new Date();

  // Pipeline stages
  const stages = ["Researched", "Qualified", "Drafting", "Internal Review", "Submitted", "Awarded", "Declined", "Passed"];
  const byStage = {};
  for (const stage of stages) byStage[stage] = [];
  for (const g of grants) {
    const stage = g.status || "Researched";
    if (!byStage[stage]) byStage[stage] = [];
    byStage[stage].push(g);
  }

  // Active pipeline (excludes Awarded/Declined/Passed)
  const active = grants.filter((g) => !["Awarded", "Declined", "Passed"].includes(g.status));
  const activeValue = active.reduce((s, g) => s + (g.amount || 0), 0);

  // Won/Lost
  const awarded = byStage["Awarded"] || [];
  const awardedValue = awarded.reduce((s, g) => s + (g.amount || 0), 0);

  // Upcoming deadlines
  const upcoming = active
    .filter((g) => g.deadline && new Date(g.deadline) > now)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5);

  // Programs
  const byProgram = {};
  for (const g of grants) {
    for (const p of g.programs) {
      if (!byProgram[p]) byProgram[p] = { count: 0, value: 0, awarded: 0 };
      byProgram[p].count++;
      byProgram[p].value += g.amount || 0;
      if (g.status === "Awarded") byProgram[p].awarded += g.amount || 0;
    }
  }

  // Output
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║      WBB FUNDING PIPELINE REPORT         ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`\nGenerated: ${now.toISOString().split("T")[0]}\n`);

  console.log("─── Summary ───\n");
  console.log(`  Total opportunities:  ${grants.length}`);
  console.log(`  Active pipeline:      ${active.length} ($${activeValue.toLocaleString()})`);
  console.log(`  Awarded:              ${awarded.length} ($${awardedValue.toLocaleString()})`);

  console.log("\n─── Pipeline by Stage ───\n");
  for (const stage of stages) {
    const items = byStage[stage] || [];
    if (items.length === 0) continue;
    const val = items.reduce((s, g) => s + (g.amount || 0), 0);
    const bar = "█".repeat(Math.min(items.length * 2, 20));
    console.log(`  ${stage.padEnd(18)} ${bar} ${items.length} ($${val.toLocaleString()})`);
  }

  console.log("\n─── By Program ───\n");
  for (const [prog, data] of Object.entries(byProgram)) {
    console.log(`  ${prog.padEnd(20)} ${data.count} grants, $${data.value.toLocaleString()} pipeline, $${data.awarded.toLocaleString()} awarded`);
  }

  if (upcoming.length > 0) {
    console.log("\n─── Next 5 Deadlines ───\n");
    for (const g of upcoming) {
      const days = Math.ceil((new Date(g.deadline) - now) / (1000 * 60 * 60 * 24));
      const urgent = days <= 14 ? " ⚠" : "";
      console.log(`  ${g.deadline}  ${g.name.padEnd(35)} $${(g.amount || 0).toLocaleString().padStart(10)}  (${days} days)${urgent}`);
    }
  }

  console.log("\n─── Recommended Actions ───\n");

  const needsQualification = (byStage["Researched"] || []).length;
  if (needsQualification > 0) {
    console.log(`  • ${needsQualification} opportunities need qualification review`);
  }

  const needsDrafting = (byStage["Qualified"] || []).length;
  if (needsDrafting > 0) {
    console.log(`  • ${needsDrafting} qualified grants ready for proposal drafting`);
  }

  const needsReview = (byStage["Drafting"] || []).length;
  if (needsReview > 0) {
    console.log(`  • ${needsReview} proposals in drafting — check progress`);
  }

  const overdueDeadlines = active.filter((g) => g.deadline && new Date(g.deadline) < now);
  if (overdueDeadlines.length > 0) {
    console.log(`  • ${overdueDeadlines.length} grants have PAST deadlines — update status`);
  }

  console.log("");

  if (shouldSave) {
    const report = {
      generated: now.toISOString(),
      summary: { total: grants.length, active: active.length, activeValue, awardedCount: awarded.length, awardedValue },
      byStage: Object.fromEntries(Object.entries(byStage).map(([k, v]) => [k, v.length])),
      byProgram,
      upcoming: upcoming.map((g) => ({ name: g.name, deadline: g.deadline, amount: g.amount })),
    };
    const outPath = resolve(__dirname, "../../reports", `pipeline-report-${Date.now()}.json`);
    await writeFile(outPath, JSON.stringify(report, null, 2));
    console.log(`Saved to: ${outPath}`);
  }

  log("pipeline-report:complete", { total: grants.length, active: active.length });
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
    priority: p["Priority Score"]?.select?.name || "",
    matchScore: p["Match Score"]?.number || null,
  };
}

main().catch((err) => {
  error("pipeline-report:error", err);
  process.exit(1);
});
