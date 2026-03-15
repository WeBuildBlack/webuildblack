#!/usr/bin/env node

/**
 * Add Opportunity — add a grant to the Notion pipeline
 *
 * Usage:
 *   node add-opportunity.js --dry-run \
 *     --name="Google.org Impact Challenge" \
 *     --funder="Google" \
 *     --amount=250000 \
 *     --deadline=2026-09-01 \
 *     --type=corporate \
 *     --programs="Fast Track,The Bridge" \
 *     --url="https://example.com/grant" \
 *     --notes="Requires 501(c)(3) status"
 *
 *   # Remove --dry-run to actually create in Notion
 */

import notion from "../../../automations/scripts/utils/notion-client.js";
import { log, error } from "../../../automations/scripts/utils/logger.js";
import { scoreOpportunity } from "../utils/grant-matcher.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

function getArg(name) {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split("=").slice(1).join("=") : null;
}

const name = getArg("name");
const funder = getArg("funder");
const amount = Number(getArg("amount")) || 0;
const deadline = getArg("deadline");
const grantType = getArg("type") || "Foundation Grant";
const programs = getArg("programs")?.split(",").map((p) => p.trim()) || [];
const url = getArg("url") || "";
const notes = getArg("notes") || "";
const focus = getArg("focus")?.split(",").map((f) => f.trim()) || [];

if (!name || !funder) {
  console.error("Error: --name and --funder are required");
  console.error("\nUsage: node add-opportunity.js --name=\"Grant Name\" --funder=\"Org\" --amount=50000 --deadline=2026-09-01 [--dry-run]");
  process.exit(1);
}

const DB_ID = process.env.NOTION_GRANT_TRACKER_DB_ID;

if (!DB_ID && !dryRun) {
  console.error("Error: NOTION_GRANT_TRACKER_DB_ID not set in environment");
  process.exit(1);
}

// Map grant type shorthand to full labels
const TYPE_MAP = {
  foundation: "Foundation Grant",
  corporate: "Corporate Sponsorship",
  government: "Government Grant",
  community: "Community Grant",
  individual: "Individual Donor",
  "in-kind": "In-Kind",
};

const resolvedType = TYPE_MAP[grantType.toLowerCase()] || grantType;

async function main() {
  // Score the opportunity
  const score = scoreOpportunity({
    name,
    funder,
    amount,
    focusAreas: focus,
    description: notes,
    grantType: grantType.toLowerCase(),
    isRepeat: false,
  });

  console.log("\n=== Grant Opportunity ===\n");
  console.log(`Name: ${name}`);
  console.log(`Funder: ${funder}`);
  console.log(`Amount: $${amount.toLocaleString()}`);
  console.log(`Deadline: ${deadline || "N/A"}`);
  console.log(`Type: ${resolvedType}`);
  console.log(`Programs: ${programs.join(", ") || "Auto-detected: " + score.bestProgramName}`);
  console.log(`URL: ${url || "N/A"}`);

  console.log("\n--- Match Score ---\n");
  console.log(`Total: ${score.totalScore}/100 — ${score.recommendation}`);
  console.log(`  Mission Alignment: ${score.dimensions.missionAlignment}/25`);
  console.log(`  Program Fit: ${score.dimensions.programFit}/25`);
  console.log(`  Capacity Match: ${score.dimensions.capacityMatch}/25`);
  console.log(`  Strategic Value: ${score.dimensions.strategicValue}/25`);
  console.log(`Best Program: ${score.bestProgramName}`);

  const priority = score.totalScore >= 75 ? "1 - Critical" :
                   score.totalScore >= 60 ? "2 - High" :
                   score.totalScore >= 40 ? "3 - Medium" : "4 - Low";

  const effort = resolvedType === "Government Grant" ? "Very High (federal/state)" :
                 resolvedType === "Foundation Grant" ? "Medium (short proposal)" :
                 "Low (LOI only)";

  const alignedPrograms = programs.length > 0 ? programs :
    [score.bestProgramName];

  if (dryRun) {
    console.log("\n[DRY RUN] Would create Notion page with:");
    console.log(JSON.stringify({
      "Grant Name": name,
      "Funder": funder,
      "Amount": amount,
      "Deadline": deadline,
      "Status": "Researched",
      "Grant Type": resolvedType,
      "Program Alignment": alignedPrograms,
      "Priority Score": priority,
      "Effort Level": effort,
      "Match Score": score.totalScore,
      "URL": url,
      "Notes": notes,
      "Date Added": new Date().toISOString().split("T")[0],
    }, null, 2));
    console.log("\nRemove --dry-run to create in Notion.");
  } else {
    const properties = {
      "Grant Name": { title: [{ text: { content: name } }] },
      "Funder": { select: { name: funder } },
      "Amount": { number: amount },
      "Status": { select: { name: "Researched" } },
      "Grant Type": { select: { name: resolvedType } },
      "Program Alignment": { multi_select: alignedPrograms.map((p) => ({ name: p })) },
      "Priority Score": { select: { name: priority } },
      "Effort Level": { select: { name: effort } },
      "Match Score": { number: score.totalScore },
      "Date Added": { date: { start: new Date().toISOString().split("T")[0] } },
    };

    if (deadline) properties["Deadline"] = { date: { start: deadline } };
    if (url) properties["URL"] = { url };
    if (notes) properties["Notes"] = { rich_text: [{ text: { content: notes } }] };

    const page = await notion.pages.create({
      parent: { database_id: DB_ID },
      properties,
    });

    console.log(`\nCreated in Notion: ${page.id}`);
    log("add-opportunity:created", { pageId: page.id, name, funder, score: score.totalScore });
  }
}

main().catch((err) => {
  error("add-opportunity:error", err);
  process.exit(1);
});
