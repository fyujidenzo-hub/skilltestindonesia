import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = resolve("exports", "deployed-firestore.rules");
const secureRulesPath = resolve("firestore.rules");
const outputPath = resolve("exports", "firestore.combined-transition.rules");
const configPath = resolve("exports", "firebase.transition.json");
const source = await readFile(sourcePath, "utf8");
const secureRules = await readFile(secureRulesPath, "utf8");
const closingMarker = "  }\n}";
const closingIndex = source.lastIndexOf(closingMarker);
if (closingIndex < 0) throw new Error("Could not identify the closing Firestore rules block.");

const secureBodyStartMarker = "  match /databases/{database}/documents {\n";
const secureBodyStart = secureRules.indexOf(secureBodyStartMarker);
const secureBodyEnd = secureRules.lastIndexOf(closingMarker);
if (secureBodyStart < 0 || secureBodyEnd < 0) {
  throw new Error("Could not identify the secure Firestore rules body.");
}
const secureBody = secureRules.slice(
  secureBodyStart + secureBodyStartMarker.length,
  secureBodyEnd,
);
const transitionRules = `

    // Temporary compatibility layer for the migrated Firebase Auth application.
    // Remove the legacy rules and use firestore.rules after the final cutover.
${secureBody}
`;

await mkdir(resolve("exports"), { recursive: true });
await writeFile(
  outputPath,
  `${source.slice(0, closingIndex)}${transitionRules}${source.slice(closingIndex)}`,
  "utf8",
);
await writeFile(
  configPath,
  `${JSON.stringify({ firestore: { rules: outputPath } }, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({ sourcePath, secureRulesPath, outputPath, configPath }, null, 2));
