#!/usr/bin/env node

/**
 * Evaluate Opportunity — score a grant and recommend action
 *
 * Usage:
 *   node evaluate-opportunity.js \
 *     --name="Google.org Impact Challenge" \
 *     --funder="Google" \
 *     --amount=250000 \
 *     --focus="workforce,STEM,racial-equity" \
 *     --description="Supports nonprofits using tech for social good" \
 *     --type=corporate \
 *     --repeat
 */

import { scoreOpportunity, WBB_PROGRAMS } from "../utils/grant-matcher.js";

const args = process.argv.slice(2);

function getArg(name) {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split("=").slice(1).join("=") : null;
}

const name = getArg("name");
const funder = getArg("funder");
const amount = Number(getArg("amount")) || 0;
const focus = getArg("focus")?.split(",").map((f) => f.trim()) || [];
const description = getArg("description") || "";
const grantType = getArg("type") || "foundation";
const isRepeat = args.includes("--repeat");

if (!name || !funder) {
  console.error("Error: --name and --funder are required\n");
  console.error("Usage: node evaluate-opportunity.js --name=\"Grant Name\" --funder=\"Org\" --amount=50000 --focus=\"workforce,STEM\"");
  console.error("\nOptions:");
  console.error("  --name       Grant name (required)");
  console.error("  --funder     Funder organization (required)");
  console.error("  --amount     Grant amount in USD");
  console.error("  --focus      Comma-separated focus areas (workforce, STEM, racial-equity, youth, nyc)");
  console.error("  --description  Grant description text");
  console.error("  --type       foundation, corporate, government, community");
  console.error("  --repeat     Flag if this funder has funded WBB before");
  process.exit(1);
}

const result = scoreOpportunity({
  name,
  funder,
  amount,
  focusAreas: focus,
  description,
  grantType,
  isRepeat,
});

console.log("\n╔══════════════════════════════════════════╗");
console.log("║       GRANT OPPORTUNITY EVALUATION       ║");
console.log("╚══════════════════════════════════════════╝\n");

console.log(`Grant:  ${name}`);
console.log(`Funder: ${funder}`);
console.log(`Amount: $${amount.toLocaleString()}`);
console.log(`Type:   ${grantType}`);
console.log(`Focus:  ${focus.join(", ") || "none specified"}`);
if (isRepeat) console.log(`        ★ Repeat funder`);

console.log("\n─── Overall Score ───\n");
console.log(`  ${result.totalScore}/100 — ${result.recommendation}`);

console.log("\n─── Dimensions (25 pts each) ───\n");
console.log(`  Mission Alignment:  ${"█".repeat(result.dimensions.missionAlignment)}${"░".repeat(25 - result.dimensions.missionAlignment)} ${result.dimensions.missionAlignment}/25`);
console.log(`  Program Fit:        ${"█".repeat(result.dimensions.programFit)}${"░".repeat(25 - result.dimensions.programFit)} ${result.dimensions.programFit}/25`);
console.log(`  Capacity Match:     ${"█".repeat(result.dimensions.capacityMatch)}${"░".repeat(25 - result.dimensions.capacityMatch)} ${result.dimensions.capacityMatch}/25`);
console.log(`  Strategic Value:    ${"█".repeat(result.dimensions.strategicValue)}${"░".repeat(25 - result.dimensions.strategicValue)} ${result.dimensions.strategicValue}/25`);

console.log("\n─── Program Scores ───\n");
const sortedPrograms = Object.entries(result.programScores).sort((a, b) => b[1] - a[1]);
for (const [slug, score] of sortedPrograms) {
  const marker = slug === result.bestProgram ? " ← best fit" : "";
  console.log(`  ${WBB_PROGRAMS[slug].name.padEnd(20)} ${score}/25${marker}`);
}

console.log("\n─── Recommended Action ───\n");
if (result.totalScore >= 75) {
  console.log("  → PURSUE: Add to pipeline as Priority 1");
  console.log("  → Begin proposal draft immediately");
  console.log(`  → Target program: ${result.bestProgramName}`);
} else if (result.totalScore >= 60) {
  console.log("  → APPLY: Add to pipeline as Priority 2");
  console.log("  → Schedule proposal drafting before deadline");
  console.log(`  → Target program: ${result.bestProgramName}`);
} else if (result.totalScore >= 40) {
  console.log("  → CONSIDER: Add to pipeline as Priority 3");
  console.log("  → Apply only if bandwidth allows");
  console.log(`  → Target program: ${result.bestProgramName}`);
} else {
  console.log("  → PASS: Low alignment with WBB programs");
  console.log("  → Document for future reference only");
}

console.log("\n─── Next Steps ───\n");
console.log("  1. Review evaluation with Devin");
console.log(`  2. Run: node add-opportunity.js --dry-run --name="${name}" --funder="${funder}" --amount=${amount}`);
console.log("  3. If approved, remove --dry-run to add to Notion pipeline");
console.log("");
