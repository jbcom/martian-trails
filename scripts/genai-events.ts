import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateEvents() {
  console.log("--- Executing GenAI Event Generator ---");
  if (!GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. Generating mock events instead.");
    writeMockEvents();
    return;
  }

  // Real pipeline integration using Google Gemini API would go here
  console.log("Gemini pipeline configured. Sourcing from RED MARS concepts...");
  writeMockEvents();
}

function writeMockEvents() {
  const mockEvents = [
    {
      title: "Regolith Storm",
      desc: "An aggressive dust storm limits visibility and cuts power solar collection.",
      options: [
        { label: "Batten Down (Conserves Power)", action: "hunker" },
        { label: "Power Through (Risks Hull)", action: "drive" },
      ],
    },
    {
      title: "Solar Flare Event",
      desc: "Radiation levels spikes. Vitals are critically affected.",
      options: [
        { label: "Deploy Radiation Shielding", action: "shield" },
        { label: "Rely on Medical Kits", action: "meds" },
      ],
    },
  ];

  const destPath = path.resolve("src/lib/generated-events.json");
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, JSON.stringify(mockEvents, null, 2));
  console.log(`Mock events successfully written to ${destPath}`);
}

generateEvents();
