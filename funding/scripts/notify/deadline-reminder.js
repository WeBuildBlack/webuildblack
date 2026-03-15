#!/usr/bin/env node

/**
 * Deadline Reminder — send Slack alerts for approaching grant deadlines
 *
 * Usage:
 *   node deadline-reminder.js --dry-run            # Preview messages
 *   node deadline-reminder.js                       # Send to Slack
 *   node deadline-reminder.js --days=7              # Only grants due in 7 days
 */

import { queryDatabase } from "../../../automations/scripts/utils/notion-client.js";
import { postMessage } from "../../../automations/scripts/utils/slack-client.js";
import { log, error } from "../../../automations/scripts/utils/logger.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

function getArg(name) {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split("=")[1] : null;
}

const days = Number(getArg("days")) || 14;

const GRANT_DB = process.env.NOTION_GRANT_TRACKER_DB_ID;
const CHANNEL = process.env.SLACK_FUNDING_CHANNEL_ID;

if (!GRANT_DB) {
  console.error("Error: NOTION_GRANT_TRACKER_DB_ID not set in environment");
  process.exit(1);
}

if (!CHANNEL && !dryRun) {
  console.error("Error: SLACK_FUNDING_CHANNEL_ID not set in environment");
  process.exit(1);
}

async function main() {
  log("deadline-reminder:start", { days, dryRun });

  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const pages = await queryDatabase(GRANT_DB);
  const grants = pages.map(parseGrant).filter((g) => {
    if (["Awarded", "Declined", "Passed", "Submitted"].includes(g.status)) return false;
    if (!g.deadline) return false;
    const dl = new Date(g.deadline);
    return dl > now && dl <= cutoff;
  });

  grants.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  if (grants.length === 0) {
    console.log(`No grant deadlines in the next ${days} days.`);
    log("deadline-reminder:none", { days });
    return;
  }

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: `📋 Grant Deadline Alert — ${grants.length} upcoming` },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${grants.length} grant deadline${grants.length > 1 ? "s" : ""} in the next ${days} days:*`,
      },
    },
    { type: "divider" },
  ];

  for (const g of grants) {
    const daysLeft = Math.ceil((new Date(g.deadline) - now) / (1000 * 60 * 60 * 24));
    const urgency = daysLeft <= 3 ? "🔴" : daysLeft <= 7 ? "🟡" : "🟢";
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          `${urgency} *${g.name}*`,
          `Funder: ${g.funder} | Amount: $${(g.amount || 0).toLocaleString()}`,
          `Deadline: ${g.deadline} (*${daysLeft} day${daysLeft !== 1 ? "s" : ""}*)`,
          `Status: ${g.status} | Programs: ${g.programs.join(", ")}`,
        ].join("\n"),
      },
    });
  }

  blocks.push(
    { type: "divider" },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: `_Run \`pipeline-report.js\` for full pipeline status_` }],
    }
  );

  const text = `Grant Deadline Alert: ${grants.length} deadline${grants.length > 1 ? "s" : ""} in the next ${days} days`;

  if (dryRun) {
    console.log("\n[DRY RUN] Would send to Slack:\n");
    console.log(`Channel: ${CHANNEL || "SLACK_FUNDING_CHANNEL_ID"}`);
    console.log(`Text: ${text}\n`);
    for (const g of grants) {
      const daysLeft = Math.ceil((new Date(g.deadline) - now) / (1000 * 60 * 60 * 24));
      console.log(`  • ${g.name} (${g.funder}) — $${(g.amount || 0).toLocaleString()} — ${daysLeft} days left`);
    }
    console.log("\nRemove --dry-run to send.");
  } else {
    await postMessage(CHANNEL, text, blocks);
    console.log(`Sent deadline reminder to Slack (${grants.length} grants)`);
    log("deadline-reminder:sent", { count: grants.length, channel: CHANNEL });
  }
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
  error("deadline-reminder:error", err);
  process.exit(1);
});
