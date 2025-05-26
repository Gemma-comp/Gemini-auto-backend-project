import path from "path";
import fs from "fs/promises";
import { EntityAgentResponseType } from "../../types/entity-agent-type.js";
import { modelAgentResponseType } from "../../types/model-agent-type.js";
import { StructureAgentResponseType } from "../../types/structure-agent-type.js";
import { ai, geminiModel } from "../../utils/gemini-ai.js";
import AgentsConfig from "../../config/agents_config.js";

export type MiddlewareCreationEntry = {
  middlewarePath: string;
  code: string;
  exportedFunctions: Array<{
    name: string;
    type: "auth" | "validation" | "error" | "logging" | "custom";
    description: string;
  }>;
  dependencies: string[];
};

export type MiddlewareUsage = {
  entityName?: string; 
  operation?: string; 
  routePath?: string; 
  httpMethod?: string; 
  middlewareFunctions: string[]; 
};

export type MiddlewareAgentResponsePayload = {
  middlewareCreationCode: MiddlewareCreationEntry[];
  middlewareUsage: MiddlewareUsage[];
};

const middlewareGeneratorAgentSystemInstruction = (
  modelAgentResponse: modelAgentResponseType,
  entityAgentResponse: EntityAgentResponseType,
  structureAgentResponse: StructureAgentResponseType
): string => {
 
  const requestedMiddlewares = structureAgentResponse.files
    .filter(
      (file) => file.path.startsWith("middleware/") && file.path.endsWith(".js")
    )
    .map((file) => file.path);

  const entitiesJsonString = JSON.stringify(
    entityAgentResponse.entities,
    null,
    2
  ).replace(/`/g, "\\`");

  const modelsJsonString = JSON.stringify(
    modelAgentResponse.agentResponse.modelCreationCode,
    null,
    2
  ).replace(/`/g, "\\`");

  return `
You are an expert Node.js middleware writer for Express.js applications. Your task is to generate ONLY the middleware files specified in the project structure, with appropriate functionality based on the entities and their operations.

# Critical Rules:
1. Generate ONLY these middleware files (create if they don't exist in the list):
   ${requestedMiddlewares.map((m) => `- ${m}`).join("\n   ")}

2. Your output MUST be valid JSON matching the specified format exactly.

# Context Data:
- Project Name: ${structureAgentResponse.name}

Entities and Operations:
\`\`\`json
${entitiesJsonString}
\`\`\`

Generated Models:
\`\`\`json
${modelsJsonString}
\`\`\`

# Output Requirements:
1. For each requested middleware file:
   - Generate clean, efficient code
   - Include proper error handling
   - List all dependencies
   - Document exported functions

2. Provide middleware usage instructions specifying:
   - Which entities/operations/routes should use which middlewares
   - In what order they should be applied

3. Output Format:
\`\`\`json
{
  "middlewareCreationCode": [
    {
      "middlewarePath": "path/from/structure/agent",
      "code": "actual code...",
      "exportedFunctions": [
        {
          "name": "functionName",
          "type": "auth|validation|etc",
          "description": "What it does"
        }
      ],
      "dependencies": ["package1", "package2"]
    }
  ],
  "middlewareUsage": [
    {
      "entityName": "User",
      "operation": "create",
      "middlewareFunctions": ["validateUserInput", "authenticateJWT"]
    },
    {
      "routePath": "/auth/login",
      "httpMethod": "POST",
      "middlewareFunctions": ["validateLoginInput"]
    }
  ]
}
\`\`\`

# Implementation Guidelines:
1. Only generate code for requested middleware files
2. Focus on functionality needed by the entities/operations
3. Include common middleware patterns:
   - Input validation
   - Authentication
   - Authorization
   - Error handling
   - Request logging
4. Ensure middleware functions are properly typed for Express
5. Include JSDoc comments for each exported function
`;
};

export const middlewareGenerator = async (
  modelAgentResponse: modelAgentResponseType,
  entityAgentResponse: EntityAgentResponseType,
  structureAgentResponse: StructureAgentResponseType
): Promise<MiddlewareAgentResponsePayload> => {
  try {
    console.log("Generating middlewares.....");
    const projectFolderPath = path.join(
      process.cwd(),
      structureAgentResponse.name
    );
    const middlewareFolderPath = path.join(projectFolderPath, "middleware");

    try {
      await fs.access(projectFolderPath);
    } catch (error: any) {
      const errorMessage = `Error: Project folder "${structureAgentResponse.name}" does not exist at "${projectFolderPath}". Please ensure the project folder exists in your current working directory.`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      await fs.mkdir(middlewareFolderPath, { recursive: true });
      console.log(
        `Successfully ensured middleware folder exists: "${middlewareFolderPath}"`
      );
    } catch (error: any) {
      if (error.code !== "EEXIST") {
        console.error(
          `Error creating middleware folder: "${middlewareFolderPath}"`,
          error
        );
        throw error;
      }
      console.log(
        `Middleware folder already exists: "${middlewareFolderPath}"`
      );
    }

    console.log(
      "Requesting middleware functions and implementation from AI..."
    );
    const response = await ai.models.generateContent({
      model: geminiModel,
      config: AgentsConfig.config(
        middlewareGeneratorAgentSystemInstruction(
          modelAgentResponse,
          entityAgentResponse,
          structureAgentResponse
        )
      ),
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Generate essential Express.js middleware files for the ${structureAgentResponse.name} project based on the provided context. Focus on authentication, authorization based on entities, and input validation for entity operations. Ensure the output strictly follows the specified JSON format.`,
            },
          ],
        },
      ],
    });

    if (!response.text) {
      throw new Error("Empty response from AI model.");
    }

    let jsonString = response.text;

    jsonString = jsonString.trim();
    if (jsonString.startsWith("```json")) {
      jsonString = jsonString.slice("```json".length).trim();
    }
    if (jsonString.endsWith("```")) {
      jsonString = jsonString.slice(0, -3).trim();
    }

    if (!jsonString) {
      throw new Error("Empty JSON string after cleaning from AI response.");
    }

    const parsedResponse: MiddlewareAgentResponsePayload =
      JSON.parse(jsonString);

    for (const entry of parsedResponse.middlewareCreationCode) {
      const filePath = path.join(projectFolderPath, entry.middlewarePath);
      const directoryPath = path.dirname(filePath);

      await fs.mkdir(directoryPath, { recursive: true });
      await fs.writeFile(filePath, entry.code, "utf8");
      console.log(`Successfully wrote middleware file: ${filePath}`);
    }

    console.log("Middleware functions generated and written successfully.");
    return parsedResponse;
  } catch (error) {
    console.error("Error in middleware generation:", error);
    throw error;
  }
};
