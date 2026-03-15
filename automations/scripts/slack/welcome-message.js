import { postMessage } from "../utils/slack-client.js";
import { log } from "../utils/logger.js";

const DRY_RUN = process.argv.includes("--dry-run");

export async function sendWelcome(userId) {
  const msg = `Welcome to We Build Black! We're glad you're here. Check out #introductions to say hello, and explore our channels to find your community.`;

  if (DRY_RUN) {
    log("dry-run", { to: userId, message: msg });
  } else {
    await postMessage(userId, msg);
    log("sent-welcome", { to: userId });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const userId = process.argv[2];
  if (!userId) { console.error("Usage: welcome-message.js <userId>"); process.exit(1); }
  sendWelcome(userId).catch(err => { console.error(err); process.exit(1); });
}
