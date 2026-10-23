// Writes public/data/cases/index.json listing the agent answer files present, so the UI never requests missing files.
import { readdirSync, writeFileSync } from "node:fs";
const dir = new URL("../public/data/cases/", import.meta.url);
const ids = readdirSync(dir).filter((f) => /^HHG-\d+\.json$/.test(f)).map((f) => f.replace(".json", "")).sort();
writeFileSync(new URL("index.json", dir), JSON.stringify({ answers: ids }, null, 1));
console.log(`answer manifest: ${ids.length} file(s)`);
