import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Helper to get Gemini client safely
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return null;
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // Endpoint 1: Extract demonstrated technical skills & competencies from project description & evaluator notes
  app.post("/api/ai/extract-skills", async (req, res) => {
    const { projectTitle, projectDescription, evaluatorNotes } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Deterministic domain keyword extraction fallback when API key is not configured
      const combined = `${projectTitle || ""} ${projectDescription || ""} ${evaluatorNotes || ""}`.toLowerCase();
      const catalogSkills = [
        "Linux", "Python", "Network Security", "Packet Analysis", "Firewall Configuration",
        "SIEM", "Bash Scripting", "TCP/IP", "VLAN Configuration", "Cisco IOS",
        "Routing & Switching", "Wi-Fi Diagnostics", "Cable Termination", "TypeScript",
        "React", "SQL", "Node.js", "Git", "REST APIs", "Unit Testing", "Data Visualization",
        "Excel", "Pandas", "Statistical Analysis", "Dashboarding", "AWS", "Docker",
        "IAM", "Cloud Monitoring", "Circuit Assembly", "Multimeter Diagnostics",
        "Three-Phase Wiring", "Motor Controls", "Safety Lockout/Tagout", "PCB Soldering",
        "Oscilloscope", "Microcontrollers", "Schematic Reading", "Sensor Calibration",
        "AutoCAD", "SolidWorks", "Technical Drawing", "GD&T", "3D Printing",
        "PLC Programming", "Ladder Logic", "SCADA", "Pneumatics", "Industrial Sensors",
        "MQTT", "ESP32/Arduino", "Edge Computing", "Sensor Networks", "Embedded C"
      ];
      const extractedSkills = catalogSkills.filter(skill =>
        combined.includes(skill.toLowerCase()) ||
        skill.toLowerCase().split(" ").some(w => w.length > 3 && combined.includes(w))
      );

      res.json({
        source: "deterministic-fallback",
        extractedSkills: extractedSkills.length > 0 ? extractedSkills : ["Linux", "Troubleshooting", "Technical Documentation"],
        extractedCompetencies: ["System Troubleshooting", "Technical Execution", "Diagnostic Reasoning"],
        summary: "Extracted directly from artifact terminology using deterministic vocational lexicon matching.",
      });
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `Analyze this vocational student's practical project and instructor observation. Extract demonstrated technical skills, demonstrated vocational competencies, and a concise 1-sentence evidence summary.
Project Title: ${projectTitle}
Project Description: ${projectDescription}
Evaluator Notes: ${evaluatorNotes}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              extractedSkills: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Concrete technical skills demonstrated in the text",
              },
              extractedCompetencies: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Practical competencies demonstrated",
              },
              summary: {
                type: Type.STRING,
                description: "Concise 1-sentence summary of demonstrated evidence",
              },
            },
            required: ["extractedSkills", "extractedCompetencies", "summary"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({
        source: "gemini-3.8-flash",
        ...parsed,
      });
    } catch (error: any) {
      res.status(200).json({
        source: "deterministic-fallback",
        extractedSkills: ["Troubleshooting", "Practical Implementation"],
        extractedCompetencies: ["Applied Technical Execution"],
        summary: "Fallback skill extraction completed due to external API unavailability.",
        errorNote: error?.message,
      });
    }
  });

  // Endpoint 2: Summarize evaluator observations and suggest concrete skill-development activities
  app.post("/api/ai/explain-recommendation", async (req, res) => {
    const { studentName, roleTitle, matchedEvidence, missingSkills, evaluatorObservations } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      res.json({
        source: "deterministic-fallback",
        narrative: `${studentName}'s suitability for ${roleTitle} is grounded in verified practical artifacts (${(matchedEvidence || []).slice(0, 3).join(", ")}). To reach full role readiness, targeted workshop practice is recommended in ${(missingSkills || []).slice(0, 2).join(" and ") || "advanced diagnostics"}.`,
        suggestedActivities: (missingSkills || []).map((s: string) => `Complete supervised workshop module & practical lab assessment for ${s}`),
      });
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `You are an assistive vocational career advisor. Based ONLY on the traceable student evidence below, write a 2-sentence synthesis explaining why ${studentName} matches the role of ${roleTitle}, and provide 3 concrete workshop/lab activities to address the missing skills.
Matched Evidence: ${JSON.stringify(matchedEvidence)}
Missing Skills: ${JSON.stringify(missingSkills)}
Evaluator Observations: ${JSON.stringify(evaluatorObservations)}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              narrative: { type: Type.STRING },
              suggestedActivities: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["narrative", "suggestedActivities"],
          },
        },
      });
      const parsed = JSON.parse(response.text || "{}");
      res.json({
        source: "gemini-3.8-flash",
        ...parsed,
      });
    } catch (error: any) {
      res.status(200).json({
        source: "deterministic-fallback",
        narrative: `${studentName} demonstrates verified competencies for ${roleTitle} across multiple practical assessments. Addressing gaps in ${(missingSkills || []).join(", ")} will strengthen placement readiness.`,
        suggestedActivities: (missingSkills || []).map((s: string) => `Complete practical lab module in ${s}`),
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SkillEvidence Server running on http://localhost:${PORT}`);
  });
}

startServer();
