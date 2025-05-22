import AgentsConfig from "../config/agents_config.js";
import { ai, geminiModel } from "../utils/gemini-ai.js";

const structureAgentSystemInstruction = (
  entityRecognitionAgentResponse: object
) => {
  return `
You are a Node.js filesystem architect. Generate a PRODUCTION-READY folder structure with these strict requirements:

--- INPUT DATA ---
${JSON.stringify(entityRecognitionAgentResponse, null, 2)}
--- END DATA ---

# Critical Requirements:
1. PROJECT NAME:
   - Generate a short, descriptive name (lowercase, hyphenated)
   - Based on main entities (e.g., "blog-api", "user-management")

2. MUST INCLUDE FOR EACH ENTITY:
   - Model: models/<Entity>.model.js
   - Controller: controllers/<entity>.controller.js  
   - Routes: routes/<entity>.routes.js

3. AUTHENTICATION (if specified):
   - config/jwt.config.js
   - middleware/auth.middleware.js
   - Add to User model: refreshToken: { type: String }

4. CORE FILES:
   - config/db.config.js
   - app.js (Express setup)
   - server.js (HTTP server)
   - package.json

5. FILE TYPE MAPPING:
${JSON.stringify(
  {
    "mongoose-model": "Mongoose schema file",
    controller: "Business logic",
    routes: "API endpoints",
    config: "Configuration",
    "express-app": "Express application",
    "http-server": "Server bootstrap",
    "package-config": "NPM package config",
    "auth-middleware": "Authentication middleware",
  },
  null,
  2
)}

6. STRICT OUTPUT FORMAT:
{
  "name": "project-name",
  "files": [
    { "path": "file/path.js", "type": "file-type" }
  ]
}

# Example of Perfect Output:
${JSON.stringify(
  {
    name: "social-blog-api",
    files: [
      // Models
      { path: "models/User.model.js", type: "mongoose-model" },
      { path: "models/Post.model.js", type: "mongoose-model" },
      { path: "models/Comment.model.js", type: "mongoose-model" },

      // Controllers
      { path: "controllers/user.controller.js", type: "controller" },
      { path: "controllers/post.controller.js", type: "controller" },
      { path: "controllers/comment.controller.js", type: "controller" },

      // Routes
      { path: "routes/user.routes.js", type: "routes" },
      { path: "routes/post.routes.js", type: "routes" },
      { path: "routes/comment.routes.js", type: "routes" },

      // Auth
      { path: "middleware/auth.middleware.js", type: "auth-middleware" },
      { path: "config/jwt.config.js", type: "config" },

      // Core
      { path: "config/db.config.js", type: "config" },
      { path: "app.js", type: "express-app" },
      { path: "server.js", type: "http-server" },
      { path: "package.json", type: "package-config" },
    ],
  },
  null,
  2
)}

# Validation Checklist Before Responding:
1. ✓ All entities have model/controller/route files
2. ✓ Authentication files included if needed
3. ✓ All core files present
4. ✓ Consistent naming conventions
5. ✓ Valid JSON format with no extra text
`;
};
export const structureGenerationAgent = async (
  entityRecognitionAgentResponse: object
): Promise<{
  name: string;
  files: Array<{ path: string; type: string }>;
}> => {
  try {
    console.log("-----------------Generating project structure---------------");

    const response = await ai.models.generateContent({
      model: geminiModel,
      config: AgentsConfig.config(
        structureAgentSystemInstruction(entityRecognitionAgentResponse)
      ),
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Generate folder structure based on the provided entity data",
            },
          ],
        },
      ],
    });

    if (!response?.text) {
      throw new Error("Empty response from AI model");
    }

    let jsonString = response.text.trim();

    if (jsonString.startsWith("```json")) {
      jsonString = jsonString.slice(7).trim();
    }
    if (jsonString.endsWith("```")) {
      jsonString = jsonString.slice(0, -3).trim();
    }

    if (!jsonString) {
      throw new Error("Empty JSON string after cleaning");
    }

    const parsed = JSON.parse(jsonString);

    if (!parsed?.name || !Array.isArray(parsed?.files)) {
      throw new Error("Invalid structure format returned");
    }

    return parsed;
  } catch (error) {
    console.error("Structure generation failed:", error);
    throw new Error(
      `Structure generation failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
