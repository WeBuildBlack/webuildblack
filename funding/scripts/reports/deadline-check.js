#!/usr/bin/env node

/**
 * Deadline Check — list upcoming grant deadlines
 *
 * Usage:
 *   node deadline-check.js              # Next 30 days (default)
 *   node deadline-check.js --days=14    # Next 14 days
 *   node deadline-check.js --days=90    # Next 90 days
 *   node deadline-check.js --all        # All future deadlines
 */

import { queryDatabase } from "../../../automations/scripts/utils/notion-client.js";
import { log, error } from "../../../automations/scripts/utils/logger.js";

const args = process.argv.slice(2);

function getArg(name) {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split("=")[1] : null;
}

const days = Number(getArg("days")) || 30;
const showAll = args.includes("--all");

const DB_ID = process.env.NOTION_GRANT_TRACKER_DB_ID;

if (!DB_ID) {
  console.error("Error: NOTION_GRANT_TRACKER_DB_ID not set in environment");
  process.exit(1);
}

async function main() {
  log("deadline-check:start", { days });

  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // Fetch active grants (not Awarded/Declined/Passed)
  const pages = await queryDatabase(DB_ID);
  const grants = pages.map(parseGrant).filter(
    (g) => !["Awarded", "Declined", "Passed"].includes(g.status)
  );

  // Split into categories
  const overdue = [];
  const upcoming = [];
  const noDeadline = [];

  for (const g of grants) {
    if (!g.deadline) {
      noDeadline.push(g);
    } else {
      const dl = new Date(g.deadline);
      if (dl < now) {
        overdue.push(g);
      } else if (showAll || dl <= cutoff) {
        upcoming.push(g);
      }
    }
  }

  upcoming.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  overdue.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║         GRANT DEADLINE CHECK             ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`\nDate: ${now.toISOString().split("T")[0]}  |  Window: ${showAll ? "all future" : `next ${days} days`}\n`);

  if (overdue.length > 0) {
    console.log("─── OVERDUE — Update Status ───\n");
    for (const g of overdue) {
      const daysLate = Math.ceil((now - new Date(g.deadline)) / (1000 * 60 * 60 * 24));
      console.log(`  ⚠ ${g.deadline}  ${g.name}`);
      console.log(`    ${g.funder} | $${(g.amount || 0).toLocaleString()} | Status: ${g.status} | ${daysLate} days overdue`);
      console.log("");
    }
  }

  if (upcoming.length > 0) {
    console.log("─── Upcoming Deadlines ───\n");
    for (const g of upcoming) {
      const daysLeft = Math.ceil((new Date(g.deadline) - now) / (1000 * 60 * 60 * 24));
      const urgency = daysLeft <= 7 ? "🔴" : daysLeft <= 14 ? "🟡" : "🟢";
      console.log(`  ${urgency} ${g.deadline}  ${g.name}  (${daysLeft} days)`);
      console.log(`    ${g.funder} | $${(g.amount || 0).toLocaleString()} | Status: ${g.status}`);
      console.log("");
    }
  } else {
    console.log(`No deadlines in the next ${days} days.\n`);
  }

  if (noDeadline.length > 0) {
    console.log("─── No Deadline Set ───\n");
    for (const g of noDeadline) {
      console.log(`  ? ${g.name} (${g.funder}) — ${g.status}`);
    }
    console.log("");
  }

  // Summary
  console.log("─── Summary ───\n");
  console.log(`  Overdue:      ${overdue.length}`);
  console.log(`  Upcoming:     ${upcoming.length}`);
  console.log(`  No deadline:  ${noDeadline.length}`);
  console.log("");

  log("deadline-check:complete", { overdue: overdue.length, upcoming: upcoming.length });
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
  };
}

main().catch((err) => {
  error("deadline-check:error", err);
  process.exit(1);
});
