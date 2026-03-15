import { queryDatabase } from "../utils/notion-client.js";
import { postMessage } from "../utils/slack-client.js";
import { log } from "../utils/logger.js";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  log("weekly-digest-start");
  // TODO: Aggregate weekly activity from Notion and format digest
  const digest = "Weekly digest coming soon!";

  if (DRY_RUN) {
    log("dry-run", { channel: "general", digest });
  } else {
    await postMessage(process.env.SLACK_GENERAL_CHANNEL_ID, digest);
    log("sent-digest");
  }
}

main().catch(err => { console.error(err); process.exit(1); });
