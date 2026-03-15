import { WebClient } from "@slack/web-api";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export async function postMessage(channel, text, blocks = undefined) {
  return slack.chat.postMessage({ channel, text, blocks });
}

export async function listChannels() {
  const result = await slack.conversations.list({ types: "public_channel" });
  return result.channels;
}

export default slack;
