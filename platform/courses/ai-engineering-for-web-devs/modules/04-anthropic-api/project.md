---
title: "Module Project: Doc Analyzer"
estimatedMinutes: 75
---

# Doc Analyzer

Build a CLI tool that feeds a long document into Claude's 200K context window and extracts structured data using tool use.

## Overview

Claude's massive context window and tool use capabilities make it uniquely powerful for document analysis. You'll build a tool that takes a long text document -- like a company earnings report, a technical RFC, or a legal contract -- sends the entire thing to Claude, and uses tool use to extract structured insights as clean JSON. No chunking, no summarization tricks. You just feed it the whole document and get structured data back. This is the kind of tool that saves analysts hours of manual reading.

## What You'll Practice

- Making API calls with the Anthropic Messages API (from Lesson 1: Messages API)
- Defining tools and handling tool use responses (from Lesson 2: Claude Tool Use)
- Working with long documents inside Claude's 200K token context window (from Lesson 3: Long Context)
- Applying Claude-specific prompting best practices (from Lesson 4: Best Practices)
- Implementing prompt caching for repeated analysis of the same document

## Prerequisites

- **Node.js 18+** installed
- **Anthropic API key** with access to Claude Sonnet
- A long text document to analyze (we'll create a sample, and you can bring your own)
- Completed Module 01-03 projects or equivalent experience

## Project Setup

```bash
mkdir doc-analyzer && cd doc-analyzer
npm init -y
npm install @anthropic-ai/sdk
```

Create your `.env` file:

```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Create the project files:

```bash
touch analyzer.js tools.js sample-report.txt
```

### Create a Sample Document

Paste the following into `sample-report.txt`. This simulates a company's quarterly report (you can replace this with any real document you want to analyze):

```bash
cat > sample-report.txt << 'ENDDOC'
ACME TECHNOLOGIES INC.
Q4 2025 EARNINGS REPORT

EXECUTIVE SUMMARY

Acme Technologies delivered strong fourth-quarter results, with revenue reaching $2.4 billion, representing a 23% year-over-year increase. Operating income grew to $580 million, up from $410 million in Q4 2024, driven primarily by expansion in our cloud services division and improved operational efficiency. Net income for the quarter was $445 million, or $3.12 per diluted share, exceeding analyst consensus of $2.87 per share.

The company achieved a significant milestone with total annual recurring revenue (ARR) surpassing $8 billion for the first time, a 28% increase from the prior year. Customer retention rate remained strong at 94%, while net revenue retention reached 118%, indicating healthy expansion within our existing customer base.

SEGMENT PERFORMANCE

Cloud Services Division
Revenue: $1.42 billion (up 34% YoY)
Operating margin: 31.2% (up from 26.8%)
Key driver: Enterprise adoption of our AI-powered analytics platform, which saw 156% growth in new customer acquisitions. Over 2,400 enterprise customers are now using at least one AI product, up from 890 in Q4 2024. The launch of AutoML Suite in September contributed $180 million in Q4 revenue alone.

Enterprise Software Division
Revenue: $680 million (up 12% YoY)
Operating margin: 28.5% (down from 29.1%)
Key driver: Continued migration of legacy customers to subscription model. 72% of enterprise customers are now on subscription plans, up from 58% a year ago. The slight margin compression reflects increased investment in the migration support team, which we expect to normalize by Q2 2026.

Professional Services Division
Revenue: $300 million (up 8% YoY)
Operating margin: 18.3% (up from 16.7%)
Key driver: Growing demand for AI implementation consulting. We completed 340 implementation projects in Q4, with an average project value of $882K. Customer satisfaction scores averaged 4.6/5.0 across all engagements.

RISK FACTORS

1. Competitive Pressure: Major cloud providers including AWS, Azure, and GCP are rapidly expanding their AI service offerings, which could compress our pricing power in the cloud services segment. We have observed initial pricing pressure in the mid-market segment.

2. Talent Acquisition: The AI talent market remains extremely competitive. Our engineering headcount grew only 8% YoY against a target of 15%. We have increased base compensation by an average of 12% and introduced a retention equity program to address this challenge.

3. Regulatory Environment: Pending AI regulations in the EU (AI Act) and proposed legislation in the US could require significant compliance investments. We have allocated $45 million in the 2026 budget for regulatory compliance infrastructure.

4. Customer Concentration: Our top 10 customers represent 22% of total revenue, down from 26% a year ago. While improving, significant loss of any major customer could materially impact results.

5. Technical Debt: The legacy enterprise software codebase requires an estimated $120 million in modernization investment over the next 18 months. Delays could impact our ability to deliver new features competitively.

FINANCIAL HIGHLIGHTS

Total Revenue: $2.4 billion
Gross Margin: 71.3%
Operating Income: $580 million
Operating Margin: 24.2%
Net Income: $445 million
Earnings Per Share: $3.12
Free Cash Flow: $520 million
Cash and Equivalents: $3.8 billion
Total Debt: $1.2 billion
Headcount: 14,200 employees (up 11% YoY)

GUIDANCE FOR Q1 2026

Revenue: $2.5 - $2.6 billion
Operating Margin: 24% - 25%
EPS: $3.20 - $3.35

We expect continued strength in cloud services and accelerating AI product adoption. The enterprise software migration should reach 80% completion by end of Q1, reducing ongoing support costs. We plan to announce two new AI products at our developer conference in March 2026.
ENDDOC
```

## Step-by-Step Instructions

### Step 1: Define the Extraction Tools

Create `tools.js` with the tool definitions that tell Claude what structured data to extract:

```javascript
// tools.js -- Define the tools Claude will use to report structured findings

export const extractionTools = [
  {
    name: 'report_financial_metrics',
    description: 'Report key financial metrics extracted from the document. Call this tool with all financial figures found.',
    input_schema: {
      type: 'object',
      properties: {
        // TODO: Define the financial metrics to extract
        // Include these fields:
        //   - revenue: { type: 'object', properties: { amount, currency, period, yoyGrowth } }
        //   - operatingIncome: { type: 'object', properties: { amount, margin } }
        //   - netIncome: { type: 'object', properties: { amount, eps } }
        //   - freeCashFlow: { type: 'number' }
        //   - arr: { type: 'object', properties: { amount, growth } }
        //   - guidance: { type: 'object', properties: { revenueRange, epsRange } }

        revenue: {
          type: 'object',
          properties: {
            amount: { type: 'number', description: 'Revenue in millions USD' },
            currency: { type: 'string' },
            period: { type: 'string', description: 'e.g., Q4 2025' },
            yoyGrowthPercent: { type: 'number' },
          },
        },
        // YOUR CODE HERE: Define operatingIncome, netIncome, freeCashFlow, arr, guidance
      },
      required: ['revenue'],
    },
  },
  {
    name: 'report_risk_factors',
    description: 'Report risk factors and challenges identified in the document.',
    input_schema: {
      type: 'object',
      properties: {
        risks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              // TODO: Define the risk schema
              // Each risk should have:
              //   - title: short name for the risk (string)
              //   - severity: "high", "medium", or "low" (string enum)
              //   - description: 1-2 sentence summary (string)
              //   - financialImpact: estimated dollar impact if mentioned (string, nullable)
              //   - mitigationStatus: what the company is doing about it (string)

              // YOUR CODE HERE
            },
            required: ['title', 'severity', 'description'],
          },
        },
      },
      required: ['risks'],
    },
  },
  {
    name: 'report_segment_performance',
    description: 'Report performance data for each business segment.',
    input_schema: {
      type: 'object',
      properties: {
        segments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              revenue: { type: 'number', description: 'Revenue in millions USD' },
              revenueGrowthPercent: { type: 'number' },
              operatingMarginPercent: { type: 'number' },
              keyHighlight: { type: 'string', description: 'Most important takeaway for this segment' },
            },
            required: ['name', 'revenue', 'revenueGrowthPercent'],
          },
        },
      },
      required: ['segments'],
    },
  },
];
```

### Step 2: Build the Core Analyzer

```javascript
// analyzer.js
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';
import { extractionTools } from './tools.js';

// Load env
const envFile = readFileSync('.env', 'utf-8');
for (const line of envFile.split('\n')) {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
}

const anthropic = new Anthropic();

// Parse CLI args
const docPath = process.argv[2];
const isDryRun = process.argv.includes('--dry-run');

if (!docPath) {
  console.error('Usage: node analyzer.js <document-path> [--dry-run]');
  process.exit(1);
}

// Read the document
let document;
try {
  document = readFileSync(docPath, 'utf-8');
} catch (e) {
  console.error(`Could not read: ${docPath}`);
  process.exit(1);
}

const charCount = document.length;
const wordCount = document.split(/\s+/).length;
// Rough token estimate: 1 token per ~4 characters for English
const estimatedTokens = Math.ceil(charCount / 4);

console.log(`\nDocument: ${docPath}`);
console.log(`Size: ${wordCount.toLocaleString()} words | ~${estimatedTokens.toLocaleString()} tokens`);
```

### Step 3: Build the Analysis Function with Tool Use

This is the heart of the project -- sending the document to Claude and collecting structured tool calls:

```javascript
async function analyzeDocument(doc) {
  const systemPrompt = `You are a senior financial analyst and document intelligence system. Your task is to thoroughly read the provided document and extract all relevant structured data using the available tools.

Instructions:
- Read the ENTIRE document carefully before making any tool calls
- Call EACH available tool exactly once with the extracted data
- Be precise with numbers -- extract exact figures, not approximations
- For percentages, use the numeric value (e.g., 23 for 23%)
- If a field is not mentioned in the document, omit it rather than guessing
- For risk severity: "high" means material financial impact or existential threat, "medium" means significant operational concern, "low" means manageable or already mitigated`;

  // TODO: Make the API call using anthropic.messages.create()
  // Set these options:
  //   - model: 'claude-sonnet-4-20250514'
  //   - max_tokens: 4096
  //   - system: systemPrompt
  //   - tools: extractionTools
  //   - messages: one user message containing the document
  //
  // For the user message, wrap the document in XML tags (Claude best practice):
  //   `<document>\n${doc}\n</document>\n\nAnalyze this document completely. Use all available tools to report your findings.`

  const response = await anthropic.messages.create({
    // YOUR CODE HERE
  });

  return response;
}
```

### Step 4: Process Tool Use Responses

Claude may return multiple tool use blocks in a single response. You need to collect all of them:

```javascript
function processResponse(response) {
  const results = {
    financials: null,
    risks: null,
    segments: null,
  };

  // TODO: Loop through response.content blocks
  // Each block has a .type -- you're looking for 'tool_use' blocks
  // For each tool_use block:
  //   - block.name tells you which tool was called
  //   - block.input contains the structured data
  //
  // Map tool names to result keys:
  //   'report_financial_metrics' -> results.financials
  //   'report_risk_factors' -> results.risks
  //   'report_segment_performance' -> results.segments

  for (const block of response.content) {
    if (block.type === 'tool_use') {
      // YOUR CODE HERE: Store block.input in the right results key
    }
  }

  return results;
}
```

### Step 5: Display the Extracted Data

```javascript
function displayResults(results, usage) {
  console.log('\n' + '='.repeat(60));
  console.log('DOCUMENT ANALYSIS RESULTS');
  console.log('='.repeat(60));

  // Financial Metrics
  if (results.financials) {
    const f = results.financials;
    console.log('\nFINANCIAL METRICS');
    console.log('-'.repeat(40));

    // TODO: Print each financial metric in a clean format
    // Example:
    //   Revenue:          $2,400M (Q4 2025, +23% YoY)
    //   Operating Income: $580M (24.2% margin)
    //   Net Income:       $445M ($3.12 EPS)
    //   Free Cash Flow:   $520M
    //   ARR:              $8,000M (+28% YoY)
    //
    // Use .toLocaleString() for number formatting
    // Handle missing fields gracefully (don't crash if a field is null)

    if (f.revenue) {
      console.log(`  Revenue:          $${f.revenue.amount?.toLocaleString()}M (${f.revenue.period}, +${f.revenue.yoyGrowthPercent}% YoY)`);
    }
    // YOUR CODE HERE: Print the remaining financial metrics
  }

  // Segment Performance
  if (results.segments?.segments) {
    console.log('\nSEGMENT PERFORMANCE');
    console.log('-'.repeat(40));

    // TODO: Print each segment as a formatted block
    // Show: name, revenue, growth, margin, and key highlight
    // YOUR CODE HERE
  }

  // Risk Factors
  if (results.risks?.risks) {
    console.log('\nRISK FACTORS');
    console.log('-'.repeat(40));

    // TODO: Sort risks by severity (high first) and print each one
    // Use color coding: red for high, yellow for medium, green for low
    const severityColors = {
      high: '\x1b[31m',
      medium: '\x1b[33m',
      low: '\x1b[32m',
    };
    const reset = '\x1b[0m';

    // YOUR CODE HERE: Loop through risks and print with formatting
  }

  // Usage Stats
  console.log('\n' + '='.repeat(60));
  console.log('USAGE');
  console.log('-'.repeat(40));
  console.log(`  Input tokens:  ${usage.input_tokens.toLocaleString()}`);
  console.log(`  Output tokens: ${usage.output_tokens.toLocaleString()}`);

  // TODO: Calculate cost using Claude Sonnet pricing
  // $3.00 / 1M input tokens, $15.00 / 1M output tokens
  const cost = // YOUR CODE HERE
  console.log(`  Est. cost:     $${cost.toFixed(4)}`);

  // TODO: Check if prompt caching was used
  // If response.usage.cache_creation_input_tokens or cache_read_input_tokens exist,
  // show the cache stats
  if (usage.cache_creation_input_tokens) {
    console.log(`  Cache created: ${usage.cache_creation_input_tokens.toLocaleString()} tokens`);
  }
  if (usage.cache_read_input_tokens) {
    console.log(`  Cache hit:     ${usage.cache_read_input_tokens.toLocaleString()} tokens (saving $)`);
  }

  console.log('='.repeat(60));
}
```

### Step 6: Wire It All Together

```javascript
async function main() {
  if (isDryRun) {
    console.log('\n[DRY RUN] Would analyze document with:');
    console.log(`  Model: claude-sonnet-4-20250514`);
    console.log(`  Tools: ${extractionTools.map(t => t.name).join(', ')}`);
    console.log(`  Est. input tokens: ~${estimatedTokens.toLocaleString()}`);
    const estCost = (estimatedTokens / 1_000_000) * 3.00 + (2000 / 1_000_000) * 15.00;
    console.log(`  Est. cost: ~$${estCost.toFixed(4)}`);
    return;
  }

  console.log('\nAnalyzing document...\n');
  const startTime = Date.now();

  const response = await analyzeDocument(document);
  const results = processResponse(response);
  const elapsed = Date.now() - startTime;

  console.log(`Analysis complete in ${(elapsed / 1000).toFixed(1)}s`);

  displayResults(results, response.usage);

  // Write structured JSON output
  const outputPath = docPath.replace(/\.\w+$/, '.analysis.json');
  writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nJSON output written to: ${outputPath}`);
}

main().catch(console.error);
```

### Step 7: Run Your Analyzer

```bash
# Dry run first to check estimated cost
node analyzer.js sample-report.txt --dry-run

# Run the full analysis
node analyzer.js sample-report.txt

# Check the JSON output
cat sample-report.analysis.json | head -50
```

### Step 8: Test with a Longer Document

The real power shows when you feed Claude a document that would be painful to read manually. Try these:

```bash
# Download a real SEC filing (public data, no paywall)
curl -o tesla-10k.txt "https://www.sec.gov/Archives/edgar/data/1318605/000162828024002390/tsla-20231231.htm" 2>/dev/null

# Or use any long text file you have:
node analyzer.js ~/Documents/some-long-report.txt
```

You might need to adjust the tools for different document types. That's good practice -- the tool definitions are your interface contract.

## Expected Output

```
Document: sample-report.txt
Size: 612 words | ~850 tokens

Analyzing document...

Analysis complete in 4.2s

============================================================
DOCUMENT ANALYSIS RESULTS
============================================================

FINANCIAL METRICS
----------------------------------------
  Revenue:          $2,400M (Q4 2025, +23% YoY)
  Operating Income: $580M (24.2% margin)
  Net Income:       $445M ($3.12 EPS)
  Free Cash Flow:   $520M
  ARR:              $8,000M (+28% YoY)
  Guidance:         $2,500-2,600M revenue, $3.20-3.35 EPS (Q1 2026)

SEGMENT PERFORMANCE
----------------------------------------
  Cloud Services:       $1,420M (+34% YoY, 31.2% margin)
    AI analytics platform drove 156% new customer growth

  Enterprise Software:  $680M (+12% YoY, 28.5% margin)
    72% of customers migrated to subscription model

  Professional Services: $300M (+8% YoY, 18.3% margin)
    340 implementation projects, avg. $882K value

RISK FACTORS
----------------------------------------
  [HIGH]   Competitive Pressure -- Major cloud providers expanding AI offerings
  [HIGH]   Talent Acquisition -- Only 8% headcount growth vs 15% target
  [MEDIUM] Regulatory Environment -- EU AI Act compliance, $45M allocated
  [MEDIUM] Customer Concentration -- Top 10 = 22% of revenue
  [LOW]    Technical Debt -- $120M modernization needed over 18 months

============================================================
USAGE
----------------------------------------
  Input tokens:  1,247
  Output tokens: 892
  Est. cost:     $0.0171
============================================================

JSON output written to: sample-report.analysis.json
```

## Stretch Goals

1. **Add prompt caching** for repeated queries. If you analyze the same document multiple times (e.g., with different extraction tools), use Anthropic's prompt caching feature by adding `cache_control: { type: 'ephemeral' }` to the system prompt message. Run the analysis twice and compare costs -- the second run should show cache hits and cost significantly less.

2. **Add a `--questions` mode** where, after the structured extraction, you can ask follow-up questions about the document interactively. Use Node's `readline` module to create a REPL loop that sends questions to Claude with the document still in context. Example: "What's the biggest risk to the cloud services division specifically?"

3. **Support PDF input** by adding a preprocessing step. Install `pdf-parse` (`npm install pdf-parse`) and detect `.pdf` files to convert them to text before sending to Claude. This turns your tool into a general-purpose document analyzer.

## Submission Checklist

Your project is done when:

- [ ] `node analyzer.js <document>` sends the full document to Claude and extracts structured data
- [ ] Three tool definitions are implemented: financial metrics, risk factors, segment performance
- [ ] Tool use responses are correctly parsed and all three tool calls are collected
- [ ] Extracted data is displayed in a clean, formatted terminal output
- [ ] JSON output is written to a `.analysis.json` file
- [ ] Token usage and cost are displayed after each analysis
- [ ] The `--dry-run` flag works and shows estimated cost without making API calls
- [ ] You've tested with at least one document longer than the sample report
- [ ] Financial figures in the output match the actual numbers in the document
