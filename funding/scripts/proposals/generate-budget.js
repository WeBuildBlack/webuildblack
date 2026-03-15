#!/usr/bin/env node

/**
 * Generate Budget — render budget section for proposals
 *
 * Usage:
 *   node generate-budget.js --program=fast-track                    # Full budget
 *   node generate-budget.js --program=fast-track --amount=100000    # Scaled to amount
 *   node generate-budget.js --program=fast-track --format=narrative # Narrative format
 *   node generate-budget.js --list                                  # List available budgets
 */

import { loadBudget, scaleBudget, renderTable, renderNarrative, listBudgets } from "../utils/budget-calculator.js";

const args = process.argv.slice(2);

function getArg(name) {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split("=").slice(1).join("=") : null;
}

const program = getArg("program");
const amount = Number(getArg("amount")) || 0;
const format = getArg("format") || "both";
const listMode = args.includes("--list");

async function main() {
  if (listMode) {
    const budgets = await listBudgets();
    console.log("\nAvailable budget templates:\n");
    for (const b of budgets) {
      console.log(`  - ${b}`);
    }
    console.log("\nUsage: node generate-budget.js --program=<name> [--amount=<target>] [--format=table|narrative|both]");
    return;
  }

  if (!program) {
    console.error("Error: --program is required (or use --list to see available budgets)\n");
    console.error("Usage: node generate-budget.js --program=fast-track [--amount=100000] [--format=table|narrative|both]");
    process.exit(1);
  }

  let budget;
  try {
    budget = await loadBudget(program);
  } catch {
    console.error(`Budget template not found for: ${program}`);
    const available = await listBudgets();
    console.error(`Available: ${available.join(", ")}`);
    process.exit(1);
  }

  if (amount > 0) {
    const original = budget.totalBudget;
    budget = scaleBudget(budget, amount);
    console.log(`\nScaled budget from $${original.toLocaleString()} to $${amount.toLocaleString()}\n`);
  }

  if (format === "table" || format === "both") {
    console.log(renderTable(budget));
  }

  if (format === "narrative" || format === "both") {
    if (format === "both") console.log("---\n");
    console.log("### Budget Narrative\n");
    console.log(renderNarrative(budget));
    console.log("");
  }
}

main().catch((err) => {
  console.error("Error generating budget:", err.message);
  process.exit(1);
});
