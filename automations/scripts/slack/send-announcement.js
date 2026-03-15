import { postMessage } from "../utils/slack-client.js";
import { log } from "../utils/logger.js";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const message = process.argv.find(a => a.startsWith("--message="))?.split("=").slice(1).join("=");
  if (!message) { console.error("Usage: --message='Your announcement'"); process.exit(1); }

  if (DRY_RUN) {
    log("dry-run", { channel: process.env.SLACK_ANNOUNCEMENTS_CHANNEL_ID, message });
  } else {
    await postMessage(process.env.SLACK_ANNOUNCEMENTS_CHANNEL_ID, message);
    log("sent-announcement", { message });
  }
}

main().catch(err => { console.error(err); process.exit(1); });
