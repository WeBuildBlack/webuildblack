/**
 * Grant Matcher — scores grant opportunities against WBB programs (0-100)
 *
 * Four dimensions (25 points each):
 *   1. Mission Alignment — how well the funder's focus matches WBB's mission
 *   2. Program Fit — does the grant map to a specific WBB program?
 *   3. Capacity Match — can WBB realistically execute at this scale?
 *   4. Strategic Value — relationship-building, visibility, repeat potential
 */

const WBB_PROGRAMS = {
  "fast-track": {
    name: "Fast Track",
    keywords: ["workforce", "job training", "career", "employment", "professional development", "apprenticeship", "internship", "upskilling"],
    focusAreas: ["workforce-development", "stem-education", "racial-equity"],
    budgetRange: { min: 25000, max: 200000 },
  },
  "crowns-of-code": {
    name: "Crowns of Code",
    keywords: ["youth", "coding", "children", "K-12", "after-school", "young people", "kids", "teens", "computer science education"],
    focusAreas: ["youth-programs", "stem-education", "racial-equity"],
    budgetRange: { min: 10000, max: 100000 },
  },
  "the-bridge": {
    name: "The Bridge",
    keywords: ["interview", "job search", "career readiness", "mentorship", "accountability", "mock interview", "hiring"],
    focusAreas: ["workforce-development", "racial-equity"],
    budgetRange: { min: 5000, max: 50000 },
  },
  "mavens-io": {
    name: "Mavens I/O",
    keywords: ["conference", "convening", "networking", "summit", "community event", "speakers", "tech event"],
    focusAreas: ["stem-education", "racial-equity", "community"],
    budgetRange: { min: 25000, max: 150000 },
  },
  "she-builds-black": {
    name: "She Builds Black",
    keywords: ["women", "gender equity", "women in tech", "female", "girls", "women of color"],
    focusAreas: ["racial-equity", "stem-education", "workforce-development"],
    budgetRange: { min: 10000, max: 100000 },
  },
};

const FOCUS_AREA_KEYWORDS = {
  "stem-education": ["STEM", "technology", "engineering", "science", "math", "computer science", "coding", "programming", "digital literacy", "tech education"],
  "workforce-development": ["workforce", "employment", "job", "career", "professional", "training", "upskill", "reskill", "talent pipeline", "hiring"],
  "racial-equity": ["racial equity", "racial justice", "Black", "African American", "diversity", "DEI", "underrepresented", "minority", "inclusion", "equity"],
  "youth-programs": ["youth", "young people", "K-12", "teens", "children", "students", "after-school", "summer program"],
  "nyc-local": ["New York", "NYC", "Brooklyn", "community", "local", "neighborhood"],
};

/**
 * Score a grant opportunity against WBB programs
 * @param {Object} opportunity
 * @param {string} opportunity.name - Grant name
 * @param {string} opportunity.funder - Funder organization
 * @param {number} opportunity.amount - Grant amount in USD
 * @param {string[]} opportunity.focusAreas - e.g. ["workforce", "STEM", "racial-equity"]
 * @param {string} [opportunity.description] - Grant description text
 * @param {string} [opportunity.grantType] - foundation, corporate, government, community
 * @param {boolean} [opportunity.isRepeat] - Has this funder funded WBB before?
 * @returns {{ totalScore: number, dimensions: Object, bestProgram: string, programScores: Object, recommendation: string }}
 */
export function scoreOpportunity(opportunity) {
  const { name, funder, amount, focusAreas = [], description = "", grantType = "foundation", isRepeat = false } = opportunity;
  const descLower = (description + " " + name + " " + focusAreas.join(" ")).toLowerCase();

  const programScores = {};
  for (const [slug, program] of Object.entries(WBB_PROGRAMS)) {
    programScores[slug] = scoreProgram(program, descLower, focusAreas, amount);
  }

  const bestProgramSlug = Object.entries(programScores).sort((a, b) => b[1] - a[1])[0][0];
  const bestProgram = WBB_PROGRAMS[bestProgramSlug];

  const missionAlignment = scoreMissionAlignment(focusAreas, descLower);
  const programFit = programScores[bestProgramSlug];
  const capacityMatch = scoreCapacityMatch(amount, bestProgram, grantType);
  const strategicValue = scoreStrategicValue(funder, isRepeat, amount, grantType);

  const totalScore = Math.round(missionAlignment + programFit + capacityMatch + strategicValue);

  const recommendation = getRecommendation(totalScore);

  return {
    totalScore,
    dimensions: {
      missionAlignment: Math.round(missionAlignment),
      programFit: Math.round(programFit),
      capacityMatch: Math.round(capacityMatch),
      strategicValue: Math.round(strategicValue),
    },
    bestProgram: bestProgramSlug,
    bestProgramName: bestProgram.name,
    programScores: Object.fromEntries(
      Object.entries(programScores).map(([k, v]) => [k, Math.round(v)])
    ),
    recommendation,
  };
}

function scoreMissionAlignment(focusAreas, descLower) {
  let score = 0;
  const normalizedAreas = focusAreas.map((a) => a.toLowerCase().replace(/[^a-z]/g, ""));

  for (const [area, keywords] of Object.entries(FOCUS_AREA_KEYWORDS)) {
    const areaMatch = normalizedAreas.some(
      (a) => area.replace(/-/g, "").includes(a) || a.includes(area.replace(/-/g, ""))
    );
    const keywordMatch = keywords.some((kw) => descLower.includes(kw.toLowerCase()));
    if (areaMatch || keywordMatch) score += 5;
  }

  return Math.min(score, 25);
}

function scoreProgram(program, descLower, focusAreas, amount) {
  let score = 0;

  const keywordHits = program.keywords.filter((kw) => descLower.includes(kw.toLowerCase()));
  score += Math.min(keywordHits.length * 4, 15);

  const focusOverlap = program.focusAreas.filter((fa) =>
    focusAreas.some((a) => a.toLowerCase().replace(/[^a-z]/g, "").includes(fa.replace(/-/g, "")))
  );
  score += Math.min(focusOverlap.length * 4, 10);

  return Math.min(score, 25);
}

function scoreCapacityMatch(amount, program, grantType) {
  let score = 15;

  const { min, max } = program.budgetRange;
  if (amount >= min && amount <= max) {
    score += 10;
  } else if (amount < min) {
    score += 5;
  } else if (amount <= max * 2) {
    score += 3;
  }

  if (grantType === "government") score -= 3; // higher admin burden

  return Math.min(Math.max(score, 0), 25);
}

function scoreStrategicValue(funder, isRepeat, amount, grantType) {
  let score = 5;

  if (isRepeat) score += 8;
  if (amount >= 100000) score += 5;
  else if (amount >= 50000) score += 3;
  if (grantType === "corporate") score += 4; // visibility + potential for deeper partnership
  if (grantType === "foundation") score += 3;

  return Math.min(score, 25);
}

function getRecommendation(score) {
  if (score >= 75) return "Strong match — pursue immediately";
  if (score >= 60) return "Good match — worth applying";
  if (score >= 40) return "Moderate match — apply if capacity allows";
  if (score >= 25) return "Weak match — consider only if low-effort";
  return "Poor match — pass unless strategic reason exists";
}

export { WBB_PROGRAMS, FOCUS_AREA_KEYWORDS };
