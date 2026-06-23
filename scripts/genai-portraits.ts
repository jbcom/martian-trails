import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

async function generatePortraits() {
  console.log("--- Executing GenAI Crew Portrait Pipeline ---");
  const destPath = path.resolve("src/assets/fetched/crew-portraits.json");
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(
    destPath,
    JSON.stringify(
      {
        john: "procedural_john_avatar",
        maya: "procedural_maya_avatar",
        frank: "procedural_frank_avatar",
        nadia: "procedural_nadia_avatar",
      },
      null,
      2,
    ),
  );
  console.log(`Portraits written to ${destPath}`);
}

generatePortraits();
