import { fetchAllFeeds, selectFeedItems } from "./fetch-feeds";
async function main() {
const { items, health } = await fetchAllFeeds();
console.table(health.map((h) => ({ source: h.source, status: h.status, items: h.items, undated: h.undated, error: h.error ?? "" })));
console.log(`Selected ${selectFeedItems(items).length} items across ${new Set(selectFeedItems(items).map((i) => i.source)).size} sources`);

}
main().then(() => process.exit(0)).catch(() => { process.exit(1); });
