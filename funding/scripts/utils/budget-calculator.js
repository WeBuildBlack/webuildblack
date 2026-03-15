/**
 * Budget Calculator — renders budget templates into tables and narratives for proposals
 */

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUDGETS_DIR = resolve(__dirname, "../../templates/budgets");

/**
 * Load a program budget template
 * @param {string} program - Program slug (e.g. "fast-track")
 * @returns {Object} Budget data
 */
export async function loadBudget(program) {
  const filePath = resolve(BUDGETS_DIR, `${program}-budget.json`);
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

/**
 * Scale a budget to a target amount
 * @param {Object} budget - Budget template data
 * @param {number} targetAmount - Desired total
 * @returns {Object} Scaled budget with adjusted line items
 */
export function scaleBudget(budget, targetAmount) {
  const originalTotal = budget.lineItems.reduce((sum, item) => sum + item.amount, 0);
  const ratio = targetAmount / originalTotal;

  return {
    ...budget,
    totalBudget: targetAmount,
    lineItems: budget.lineItems.map((item) => ({
      ...item,
      amount: Math.round(item.amount * ratio),
    })),
  };
}

/**
 * Render a budget as a markdown table
 * @param {Object} budget - Budget data (raw or scaled)
 * @returns {string} Markdown table
 */
export function renderTable(budget) {
  const lines = [
    `## Budget: ${budget.program}`,
    "",
    "| Category | Line Item | Amount | Notes |",
    "|----------|-----------|--------|-------|",
  ];

  for (const item of budget.lineItems) {
    lines.push(
      `| ${item.category} | ${item.description} | $${item.amount.toLocaleString()} | ${item.notes || ""} |`
    );
  }

  const total = budget.lineItems.reduce((sum, item) => sum + item.amount, 0);
  lines.push(`| **Total** | | **$${total.toLocaleString()}** | |`);
  lines.push("");

  return lines.join("\n");
}

/**
 * Render a budget as a narrative paragraph for proposals
 * @param {Object} budget - Budget data
 * @returns {string} Narrative text
 */
export function renderNarrative(budget) {
  const total = budget.lineItems.reduce((sum, item) => sum + item.amount, 0);
  const categories = {};

  for (const item of budget.lineItems) {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item);
  }

  const parts = [`The total budget for ${budget.program} is $${total.toLocaleString()}.`];

  for (const [category, items] of Object.entries(categories)) {
    const catTotal = items.reduce((sum, item) => sum + item.amount, 0);
    const pct = Math.round((catTotal / total) * 100);
    const descriptions = items.map((i) => `${i.description} ($${i.amount.toLocaleString()})`).join(", ");
    parts.push(`${category} accounts for ${pct}% ($${catTotal.toLocaleString()}), covering ${descriptions}.`);
  }

  return parts.join(" ");
}

/**
 * List all available budget templates
 * @returns {string[]} Program slugs with available budgets
 */
export async function listBudgets() {
  const { readdir } = await import("node:fs/promises");
  const files = await readdir(BUDGETS_DIR);
  return files
    .filter((f) => f.endsWith("-budget.json"))
    .map((f) => f.replace("-budget.json", ""));
}
