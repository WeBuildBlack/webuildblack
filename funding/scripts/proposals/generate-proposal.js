#!/usr/bin/env node

/**
 * Generate Proposal — fill a proposal template with program data
 *
 * Usage:
 *   node generate-proposal.js --template=letter-of-inquiry --program=fast-track
 *   node generate-proposal.js --template=full-proposal --program=the-bridge --amount=25000 --funder="Robin Hood"
 *   node generate-proposal.js --template=corporate-sponsorship --program=mavens-io --save
 */

import { readFile } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadBudget, renderTable, renderNarrative, scaleBudget } from "../utils/budget-calculator.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

function getArg(name) {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split("=").slice(1).join("=") : null;
}

const template = getArg("template");
const program = getArg("program");
const amount = Number(getArg("amount")) || 0;
const funder = getArg("funder") || "{{FUNDER_NAME}}";
const shouldSave = args.includes("--save");

if (!template || !program) {
  console.error("Error: --template and --program are required\n");
  console.error("Templates: letter-of-inquiry, full-proposal, corporate-sponsorship, government-grant");
  console.error("Programs:  fast-track, crowns-of-code, the-bridge, mavens-io, she-builds-black");
  process.exit(1);
}

const PROGRAM_DATA = {
  "fast-track": {
    name: "Fast Track",
    description: "A workforce development program that provides structured technical training pathways in Android Development, UX Design, and Data Analytics. Participants progress through 6 milestones, earning $1,000 stipends at each stage, totaling $6,000 per participant upon completion.",
    need: "Black professionals remain underrepresented in the tech industry, comprising only 5% of the technical workforce despite making up 13% of the U.S. population. Traditional training programs often fail to address the financial barriers that prevent career changers from completing training.",
    outcomes: "15 participants per cohort complete technical training across 3 tracks. 80% completion rate. 70% job placement within 6 months of program completion. Average salary increase of $25,000+ for placed participants.",
    duration: "6 months per cohort",
    population: "Adults (21+) in the NYC metro area seeking to transition into tech careers",
  },
  "crowns-of-code": {
    name: "Crowns of Code",
    description: "A youth coding education program that introduces Black children and teens (ages 8-17) to computer science through culturally relevant curriculum, project-based learning, and mentorship from Black tech professionals.",
    need: "Only 11% of Black high school students have access to AP Computer Science courses. Early exposure to coding is a key predictor of pursuing STEM careers, yet Black youth are significantly less likely to encounter programming before college.",
    outcomes: "30+ youth participants per cohort. 90% report increased interest in STEM careers. 85% demonstrate measurable coding skill improvement. 100% complete at least one portfolio project.",
    duration: "10-week sessions, 3x per year",
    population: "Black youth ages 8-17 in Brooklyn and greater NYC",
  },
  "the-bridge": {
    name: "The Bridge",
    description: "An 8-week virtual interview accountability program that groups job-seeking tech professionals into pods of 4-5 members by target role. Members log weekly progress (DSA practice, mock interviews, applications, confidence tracking) and receive automated personalized coaching.",
    need: "Black tech professionals face documented bias in hiring processes, with callback rates 30-50% lower than white candidates with identical qualifications. The Bridge addresses this through structured preparation, peer accountability, and volume-based application strategies.",
    outcomes: "20-25 participants per cohort across 5 role-based pods. 75% graduation rate (6/8 weeks logged, 6/8 pod meetings, 4+ mocks, 10+ applications). 60% of graduates receive at least one offer within 8 weeks of program completion.",
    duration: "8 weeks, 3 cohorts per year (January, May, September)",
    population: "Black tech professionals actively seeking employment or career advancement",
  },
  "mavens-io": {
    name: "Mavens I/O Conference",
    description: "An annual technology conference centering Black technologists, featuring keynote speakers, technical workshops, career development panels, and networking opportunities. Mavens I/O creates a space where Black professionals see themselves reflected in tech leadership.",
    need: "Major tech conferences often lack meaningful representation of Black speakers, attendees, and perspectives. Black tech professionals report feeling isolated in predominantly white workplaces and industry events, impacting retention and career growth.",
    outcomes: "300+ attendees. 20+ speakers and workshop facilitators. 85% attendee satisfaction rating. 50+ companies represented. Measurable increase in attendee professional networks.",
    duration: "Annual 2-day conference plus satellite events",
    population: "Black tech professionals, students, and aspiring technologists in NYC and beyond",
  },
  "she-builds-black": {
    name: "She Builds Black",
    description: "A dedicated chapter for Black women in technology, offering workshops, mentorship circles, networking events, and professional development programming designed to address the intersectional challenges faced by Black women in the tech industry.",
    need: "Black women hold less than 2% of technical roles in the tech industry and face compounded barriers of racial and gender bias. They are the most underrepresented demographic in technology yet are the fastest-growing group of entrepreneurs.",
    outcomes: "50+ active members. Monthly workshops and networking events. 15+ mentor-mentee pairings per year. 40% of participants report career advancement within 12 months of joining.",
    duration: "Ongoing with quarterly programming cycles",
    population: "Black women in tech or aspiring to enter tech, primarily in NYC",
  },
};

async function main() {
  const templatePath = resolve(__dirname, "../../templates/proposals", `${template}.md`);
  let content;
  try {
    content = await readFile(templatePath, "utf-8");
  } catch {
    console.error(`Template not found: ${template}`);
    console.error("Available: letter-of-inquiry, full-proposal, corporate-sponsorship, government-grant");
    process.exit(1);
  }

  const prog = PROGRAM_DATA[program];
  if (!prog) {
    console.error(`Unknown program: ${program}`);
    console.error("Available: fast-track, crowns-of-code, the-bridge, mavens-io, she-builds-black");
    process.exit(1);
  }

  // Load and optionally scale budget
  let budgetTable = "";
  let budgetNarrative = "";
  try {
    let budget = await loadBudget(program);
    if (amount > 0) {
      budget = scaleBudget(budget, amount);
    }
    budgetTable = renderTable(budget);
    budgetNarrative = renderNarrative(budget);
  } catch {
    budgetTable = "{{BUDGET_TABLE — run generate-budget.js}}";
    budgetNarrative = "{{BUDGET_NARRATIVE — run generate-budget.js}}";
  }

  // Replace placeholders
  const replacements = {
    "{{PROGRAM_NAME}}": prog.name,
    "{{PROGRAM_DESCRIPTION}}": prog.description,
    "{{NEED_STATEMENT}}": prog.need,
    "{{EXPECTED_OUTCOMES}}": prog.outcomes,
    "{{PROGRAM_DURATION}}": prog.duration,
    "{{TARGET_POPULATION}}": prog.population,
    "{{FUNDER_NAME}}": funder,
    "{{REQUEST_AMOUNT}}": amount > 0 ? `$${amount.toLocaleString()}` : "{{REQUEST_AMOUNT}}",
    "{{BUDGET_TABLE}}": budgetTable,
    "{{BUDGET_NARRATIVE}}": budgetNarrative,
    "{{DATE}}": new Date().toISOString().split("T")[0],
    "{{YEAR}}": new Date().getFullYear().toString(),
  };

  let output = content;
  for (const [placeholder, value] of Object.entries(replacements)) {
    output = output.replaceAll(placeholder, value);
  }

  console.log(output);

  if (shouldSave) {
    const filename = `${template}-${program}-${Date.now()}.md`;
    const outPath = resolve(__dirname, "../../proposals", filename);
    await writeFile(outPath, output);
    console.log(`\nSaved to: ${outPath}`);
  }
}

main().catch((err) => {
  console.error("Error generating proposal:", err.message);
  process.exit(1);
});
