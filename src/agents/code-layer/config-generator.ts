import fs from "fs/promises";
import path from "path";
import { ai, geminiModel } from "../../utils/gemini-ai.js";
import AgentsConfig from "../../config/agents_config.js";

export type ConfigCreationEntry = {
  configPath: string;
  code: string;
  description: string;
  dependencies: string[];
};

export type ConfigAgentResponsePayload = {
  configCreationCode: ConfigCreationEntry[];
};

export type StructureFile = {
  path: string;
  type: string;
};

export type StructureAgentResponseType = {
  name: string;
  files: StructureFile[];
};

// The system instruction for the AI to generate configurations
const configAgentSystemInstruction = (
  structureAgentResponse: StructureAgentResponseType
): string => {
  // Identify config files explicitly from the structure agent's response
  const requestedConfigFiles: string[] = [];
  structureAgentResponse.files.forEach((file: StructureFile) => {
    if (
      file.type === "config" &&
      file.path.startsWith("config/") &&
      file.path.endsWith(".js")
    ) {
      requestedConfigFiles.push(file.path);
    } else if (file.path === "app.js" && file.type === "express-app") {
      requestedConfigFiles.push(".env.example");
    }
  });

  const uniqueRequestedConfigFiles = [...new Set(requestedConfigFiles)]; // Remove duplicates

  let structureDrivenConfigPrompt = "";
  if (uniqueRequestedConfigFiles.length > 0) {
    structureDrivenConfigPrompt = `
Based on the Project Structure, you are specifically requested to generate the following configuration files:
${uniqueRequestedConfigFiles.map((p) => `- \`${p}\``).join("\n")}

For each of these requested files, ensure you provide the complete code.`;
  } else {
    structureDrivenConfigPrompt = `
The Project Structure does not explicitly list config files. Therefore, you are expected to generate essential and commonly used configuration files for a typical Node.js Express.js application.`;
  }

  return `
You are an expert Node.js configuration writer. Your task is to generate essential configuration files required for the application, based on the project structure and common best practices.

# Context and Input Data:

1.  **Project Name:** ${structureAgentResponse.name}

2.  **Project Structure (from Structure Agent):**
    This data explicitly outlines the required directory and file structure, including any specific configuration files that need to be generated.
    \`\`\`json
    ${JSON.stringify(structureAgentResponse.files, null, 2)}
    \`\`\`

# Output Requirements:

1.  **Priority: Generate files explicitly specified by the Project Structure agent.**
    ${structureDrivenConfigPrompt}

2.  **Standard Configuration Files (If not already covered by structure or explicitly requested):**
    * **Database Configuration (\`config/db.config.js\` or similar):**
        * Generate a file to establish a connection to a **MongoDB** database using Mongoose.
        * It should use environment variables for the MongoDB URI (e.g., \`process.env.MONGODB_URI\`).
        * Include basic connection event listeners (connected, error, disconnected).
        * Export the connection function.
    * **JWT Configuration (\`config/jwt.config.js\` or similar):**
        * Generate a file to manage JWT secret keys and expiration times.
        * It should use environment variables for the JWT secret (e.g., \`process.env.JWT_SECRET\`).
        * Potentially define an expiration time (e.g., \`3d\`).
        * Export these values.
    * **Environment Variables File (\`.env.example\`):**
        * Provide an example \`.env.example\` that includes placeholders for:
            * \`PORT\` (e.g., 3000)
            * \`MONGODB_URI\` (e.g., \`mongodb://localhost:27017/${structureAgentResponse.name.toLowerCase()}-db\`)
            * \`JWT_SECRET\` (a strong random string)
            * Any other environment variables needed by generated controllers or middleware.

3.  **General Requirements for ALL Generated Configuration Files:**
    * **Module System:** Use ES Modules (\`import\`/\`export\`) where applicable (for ".js" files). For ".env.example", just provide key-value pairs.
    * **Environment Variables:** Prioritize the use of environment variables for sensitive information and configurable parameters (e.g., database URIs, API keys, port numbers). Use "process.env".
    * **Error Handling:** Implement basic error handling for connection failures (e.g., database connection).
    * **Clarity:** The code should be well-structured and easy to understand.

4.  **Structured JSON Output Format:**
    Your final output **MUST** be a JSON object with a single key \`configCreationCode\`, which is an array of objects. Each object in this array represents a configuration file.

    \`\`\`json
    {
      "configCreationCode": [
        {
          "configPath": "config/db.config.js",
          "code": "import mongoose from 'mongoose';\\n\\nconst connectDB = async () => {\\n  try {\\n    const conn = await mongoose.connect(process.env.MONGODB_URI as string);\\n    console.log("MongoDB Connected: conn.connection.host");\\n  } catch (error: any) {\\n    console.error("Error: error.message");\\n    process.exit(1); // Exit process with failure\\n  }\\n};\\n\\nexport default connectDB;",
          "description": "Database connection configuration for MongoDB.",
          "dependencies": ["mongoose"]
        },
        {
          "configPath": "config/jwt.config.js",
          "code": "const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey'; // Fallback for development\\nconst JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '3d';\\n\\nexport { JWT_SECRET, JWT_EXPIRES_IN };",
          "description": "JWT secret and expiration configuration.",
          "dependencies": []
        },
        {
          "configPath": ".env.example",
          "code": "PORT=3000\\nMONGODB_URI=mongodb://localhost:27017/hotel-booking-api-db\\nJWT_SECRET=YOUR_SUPER_SECRET_JWT_KEY_HERE\\n",
          "description": "Example environment variables for the application.",
          "dependencies": []
        }
      ]
    }
    \`\`\`

# Critical Rules:
1.  **STRICT JSON FORMAT:** Your entire output **MUST** be a valid JSON object matching the \`Output Format\` exactly, enclosed in a single markdown JSON block (\`\`\`json ... \`\`\`). Do not include any conversational text outside this JSON block.
2.  **ACCURATE PATHS:** Ensure \`configPath\` values are correct. Assume config files are in \`config/\` or at the root for \`.env.example\`.
3.  **MINIMAL IMPORTS:** Only import necessary modules.
4.  **NO EXTERNAL COMMENTS:** Do not add any conversational text or comments outside of the code strings in the JSON.
`;
};

export const configGenerator = async (
  structureAgentResponse: StructureAgentResponseType
): Promise<ConfigAgentResponsePayload> => {
  try {
    console.log("Generating configurations.....");

    const projectFolderPath = path.join(
      process.cwd(),
      structureAgentResponse.name
    );

    try {
      await fs.access(projectFolderPath);
    } catch (error: any) {
      const errorMessage = `Error: Project folder "${structureAgentResponse.name}" does not exist at "${projectFolderPath}". Please ensure the project folder exists in your current working directory.`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    const configFolderPath = path.join(projectFolderPath, "config");

    try {
      await fs.mkdir(configFolderPath, { recursive: true });
      console.log(
        `Successfully ensured config folder exists: "${configFolderPath}"`
      );
    } catch (error: any) {
      if (error.code !== "EEXIST") {
        console.error(
          `Error creating config folder: "${configFolderPath}"`,
          error
        );
        throw error;
      }
      console.log("Config folder already exists.");
    }

    console.log("Requesting configuration files and implementation from AI...");
    const response = await ai.models.generateContent({
      model: geminiModel,
      config: AgentsConfig.config(
        configAgentSystemInstruction(structureAgentResponse)
      ),
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Generate essential configuration files for the ${structureAgentResponse.name} project, including database, JWT, and environment variable setup. Ensure the output strictly follows the specified JSON format.`,
            },
          ],
        },
      ],
    });

    if (!response.text) {
      throw new Error("Empty response from AI model for config generation.");
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
      throw new Error(
        "Empty JSON string after cleaning from AI response for config generation."
      );
    }

    const parsedResponse: ConfigAgentResponsePayload = JSON.parse(jsonString);

    for (const entry of parsedResponse.configCreationCode) {
      const filePath = path.join(projectFolderPath, entry.configPath);
      const directoryPath = path.dirname(filePath);

      await fs.mkdir(directoryPath, { recursive: true });
      await fs.writeFile(filePath, entry.code, "utf8");
      console.log(`Successfully wrote config file: ${filePath}`);
    }

    console.log("Configuration files generated and written successfully.");
    return parsedResponse;
  } catch (error) {
    console.error("Error in config generation:", error);
    throw error;
  }
};
