import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

export async function queryDatabase(databaseId, filter = undefined) {
  const response = await notion.databases.query({ database_id: databaseId, filter });
  return response.results;
}

export async function updatePage(pageId, properties) {
  return notion.pages.update({ page_id: pageId, properties });
}

export default notion;
