#!/usr/bin/env node

/**
 * Search Grants — output research brief template for Claude to fill with WebSearch results
 *
 * This script is a helper for Claude's grant research workflow. It outputs a structured
 * brief that Claude populates using WebSearch, then pipes findings to evaluate-opportunity.js.
 *
 * Usage:
 *   node search-grants.js --focus="workforce,STEM" --program=fast-track
 *   node search-grants.js --focus="youth,racial-equity" --program=crowns-of-code
 */

import { WBB_PROGRAMS, FOCUS_AREA_KEYWORDS } from "../utils/grant-matcher.js";

const args = process.argv.slice(2);

function getArg(name) {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split("=").slice(1).join("=") : null;
}

const focus = getArg("focus")?.split(",").map((f) => f.trim()) || [];
const program = getArg("program");

if (focus.length === 0) {
  console.error("Error: --focus is required (comma-separated: workforce, STEM, racial-equity, youth, nyc)\n");
  console.error("Usage: node search-grants.js --focus=\"workforce,STEM\" [--program=fast-track]");
  process.exit(1);
}

console.log("\n╔══════════════════════════════════════════╗");
console.log("║        GRANT RESEARCH BRIEF              ║");
console.log("╚══════════════════════════════════════════╝\n");

console.log("Organization: We Build Black (501(c)(3))");
console.log("Location: Brooklyn, NY");
console.log(`Focus Areas: ${focus.join(", ")}`);

if (program && WBB_PROGRAMS[program]) {
  const prog = WBB_PROGRAMS[program];
  console.log(`\nTarget Program: ${prog.name}`);
  console.log(`Budget Range: $${prog.budgetRange.min.toLocaleString()} - $${prog.budgetRange.max.toLocaleString()}`);
  console.log(`Keywords: ${prog.keywords.join(", ")}`);
}

console.log("\n─── Suggested Search Queries ───\n");

const baseQueries = [
  "grant opportunities",
  "funding",
  "RFP",
  "call for proposals",
];

const focusTerms = focus.flatMap((f) => {
  const key = f.toLowerCase().replace(/\s+/g, "-");
  return FOCUS_AREA_KEYWORDS[key] || [f];
}).slice(0, 5);

const queries = [];
for (const base of baseQueries.slice(0, 2)) {
  queries.push(`${focusTerms.slice(0, 3).join(" ")} ${base} 2026 nonprofit`);
}
queries.push(`Black community ${focusTerms[0]} ${baseQueries[0]} 501c3`);
queries.push(`NYC Brooklyn ${focusTerms[0]} nonprofit funding 2026`);

if (program && WBB_PROGRAMS[program]) {
  const prog = WBB_PROGRAMS[program];
  queries.push(`${prog.keywords.slice(0, 3).join(" ")} grant nonprofit 2026`);
}

for (let i = 0; i < queries.length; i++) {
  console.log(`  ${i + 1}. "${queries[i]}"`);
}

console.log("\n─── Research Template ───\n");
console.log("For each opportunity found, record:\n");
console.log("  Grant Name: ");
console.log("  Funder: ");
console.log("  Amount: ");
console.log("  Deadline: ");
console.log("  Focus Areas: ");
console.log("  Eligibility: ");
console.log("  URL: ");
console.log("  Notes: ");
console.log("");
console.log("Then evaluate with:");
console.log('  node evaluate-opportunity.js --name="..." --funder="..." --amount=... --focus="..."');
console.log("");
