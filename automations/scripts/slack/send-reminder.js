import { queryDatabase } from "../utils/notion-client.js";
import { postMessage } from "../utils/slack-client.js";
import { log } from "../utils/logger.js";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const members = await queryDatabase(process.env.NOTION_COHORT_DB_ID, {
    property: "Status", status: { equals: "In Progress" }
  });

  for (const member of members) {
    const name = member.properties.Name?.title?.[0]?.plain_text ?? "Member";
    const handle = member.properties["Slack Handle"]?.rich_text?.[0]?.plain_text;
    const msg = `Hey ${name}! Just a friendly reminder to check in on your milestone progress. Keep up the great work!`;

    if (DRY_RUN) {
      log("dry-run", { to: handle, message: msg });
    } else {
      await postMessage(process.env.SLACK_COHORT_CHANNEL_PREFIX + "2026-q1", msg);
      log("sent-reminder", { to: handle });
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
