import { readFileSync } from "node:fs";
import { assertCompleteEdition } from "./publish-digest";
const digest = JSON.parse(readFileSync("data/digests/latest.json", "utf8"));
assertCompleteEdition(digest);
console.log(`[publication] Verified ${digest.date}: core insight and ${digest.topics.length} complete trend topics`);
