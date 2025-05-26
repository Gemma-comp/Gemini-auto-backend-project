import path from "path";
import fs from "fs/promises"; 
import { EntityAgentResponseType } from "../../types/entity-agent-type.js";
import {
  modelAgentResponseType,
  ModelCreationEntry,
} from "../../types/model-agent-type.js";
import { StructureAgentResponseType } from "../../types/structure-agent-type.js";
import { ai, geminiModel } from "../../utils/gemini-ai.js";
import AgentsConfig from "../../config/agents_config.js";

type ModelAgentResponseType = {
  message: string;
  agentResponse: {
    modelCreationCode: ModelCreationEntry[];
  };
};

export type ControllerCreationEntry = {
  controllerPath: string;
  code: string;
  exportedFunctions: Array<{
    name: string;
    type: "crud" | "auth" | "custom" | "logic";
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    routeSegment?: string;
    params?: string[];
  }>;
  dependencies: string[];
};

export type ControllerAgentResponsePayload = {
  controllerCreationCode: ControllerCreationEntry[];
};

const controllerGeneratorAgentSystemInstruction = (
  modelAgentResponse: ModelAgentResponseType,
  entityAgentResponse: EntityAgentResponseType,
  structureAgentResponse: StructureAgentResponseType
): string => {
  const controllerFiles = structureAgentResponse.files.filter(
    (f) => f.type === "controller"
  );

  return `
You are an expert backend controller writer for Node.js applications, specifically using Express.js and Mongoose. Your task is to generate complete controller files based on the provided entity definitions, model information, and the project's desired structure.

# Context and Input Data:

1.  **Project Name:** ${structureAgentResponse.name}

2.  **Entities and their Fields and Operations (from Entity Agent):**
    This data defines the conceptual models, their fields, and the operations they support. Use this to understand the requirements for each controller's logic (e.g., what fields to expect for 'create', what properties to update for 'update'). Pay close attention to the 'operations' array for each entity to determine the required functions for each controller.
    \`\`\`json
    ${JSON.stringify(entityAgentResponse.entities, null, 2)}
    \`\`\`

3.  **Generated Models (from Model Agent):**
    This data contains the actual Mongoose model code, including the 'exportName' for each model. You MUST use these 'exportName' values for importing and interacting with the Mongoose models in your controller code.
    \`\`\`json
    ${JSON.stringify(
      modelAgentResponse.agentResponse.modelCreationCode,
      null,
      2
    )}
    \`\`\`

4.  **Target Controller Files (from Structure Agent):**
    These are the specific controller files you are expected to generate. You should create a controller for each entry here.
    \`\`\`json
    ${JSON.stringify(controllerFiles, null, 2)}
    \`\`\`

# Output Requirements:

1.  **Generate a Controller for Each Target File:** For each object in the 'Target Controller Files' list (filtered by \`type === "controller"\`), generate a corresponding controller file.
2.  **Implement Operations per Entity:** For each entity's controller, implement functions for **ALL** operations listed in its \`operations\` array.
    * **Standard CRUD:** For "create", "read", "update", "delete", implement functions like \`create[EntityName]\`, \`getAll[EntityName]s\`, \`get[EntityName]ById\`, \`update[EntityName]\`, \`delete[EntityName]\`.
    * **User Controller Specifics:**
        * Implement \`registerUser\` for the "create" operation.
        * Implement \`loginUser\` for the "login" operation. This function should handle email/password verification using the \`comparePassword\` method from the User model and issue a JWT token.
        * Implement \`resetPassword\` for the "passwordReset" operation.
    * **Booking Controller Specifics:**
        * Implement \`checkInBooking\` for "checkIn" operation.
        * Implement \`checkOutBooking\` for "checkOut" operation.
        * Implement \`cancelBooking\` for "cancel" operation.
        * **Room Availability:** For booking creation (\`createBooking\`), add logic to check room availability before creating the booking.
    * **Review Controller Specifics:**
        * Implement \`moderateReview\` for the "moderate" operation.
    * **Relationships:** When creating or updating entities that have relationships (e.g., \`Room\` requires \`hotel\` ID, \`Booking\` requires \`guest\` and \`room\` IDs), ensure the controller accepts and correctly uses these references from the request body/parameters.

3.  **Error Handling:** Implement robust asynchronous error handling for all controller functions (e.g., using \`try...catch\` blocks and passing errors to Express's error-handling middleware via \`next(error)\`). Return appropriate HTTP status codes (e.g., 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error).

4.  **Input Validation:** Perform basic input validation (e.g., checking for required fields, data types) within the controller functions. For more complex validation, refer to the entity definitions for guidance.

5.  **Module System:** Use ES Modules (\`import\`/\`export\`). For example, import Mongoose models and export controller functions.

6.  **Dependency Management:** Identify and list all external npm packages (e.g., \`jsonwebtoken\`, \`bcryptjs\`) and internal modules (e.g., your Mongoose models) that each generated controller file depends on.

7.  **Structured JSON Output Format:**
    Your final output **MUST** be a JSON object with a single key \`controllerCreationCode\`, which is an array of objects. Each object in this array represents a controller file.

    \`\`\`json
    {
      "controllerCreationCode": [
        {
          "controllerPath": "controllers/user.controller.js",
          "code": "import User from '../models/User.model.js';\\nimport jwt from 'jsonwebtoken';\\nimport bcrypt from 'bcryptjs';\\n\\n// Example: export const registerUser = async (req, res, next) => { ... };\\n// Example: export const loginUser = async (req, res, next) => { ... };\\n// Example: export const resetPassword = async (req, res, next) => { ... };\\n// ... other user CRUD operations like getAllUsers, getUserById, updateUser, deleteUser",
          "exportedFunctions": [
            {
              "name": "registerUser",
              "type": "auth",
              "method": "POST",
              "routeSegment": ""
            },
            {
              "name": "loginUser",
              "type": "auth",
              "method": "POST",
              "routeSegment": "/login"
            },
            {
              "name": "resetPassword",
              "type": "auth",
              "method": "POST",
              "routeSegment": "/reset-password"
            },
            {
              "name": "getAllUsers",
              "type": "crud",
              "method": "GET",
              "routeSegment": ""
            },
            {
              "name": "getUserById",
              "type": "crud",
              "method": "GET",
              "routeSegment": "/:id",
              "params": ["id"]
            },
            {
              "name": "updateUser",
              "type": "crud",
              "method": "PUT",
              "routeSegment": "/:id",
              "params": ["id"]
            },
            {
              "name": "deleteUser",
              "type": "crud",
              "method": "DELETE",
              "routeSegment": "/:id",
              "params": ["id"]
            }
          ],
          "dependencies": ["jsonwebtoken", "bcryptjs"]
        },
        {
          "controllerPath": "controllers/booking.controller.js",
          "code": "import Booking from '../models/Booking.model.js';\\nimport Room from '../models/Room.model.js';\\n\\n// Example: export const createBooking = async (req, res, next) => { ... }; // Remember room availability check here\\n// Example: export const checkInBooking = async (req, res, next) => { ... };\\n// Example: export const checkOutBooking = async (req, res, next) => { ... };\\n// Example: export const cancelBooking = async (req, res, next) => { ... };\\n// ... other booking CRUD operations",
          "exportedFunctions": [
            {
              "name": "createBooking",
              "type": "crud",
              "method": "POST",
              "routeSegment": ""
            },
            {
              "name": "getAllBookings",
              "type": "crud",
              "method": "GET",
              "routeSegment": ""
            },
            {
              "name": "getBookingById",
              "type": "crud",
              "method": "GET",
              "routeSegment": "/:id",
              "params": ["id"]
            },
            {
              "name": "updateBooking",
              "type": "crud",
              "method": "PUT",
              "routeSegment": "/:id",
              "params": ["id"]
            },
            {
              "name": "deleteBooking",
              "type": "crud",
              "method": "DELETE",
              "routeSegment": "/:id",
              "params": ["id"]
            },
            {
              "name": "checkInBooking",
              "type": "logic",
              "method": "PATCH",
              "routeSegment": "/:id/check-in",
              "params": ["id"]
            },
            {
              "name": "checkOutBooking",
              "type": "logic",
              "method": "PATCH",
              "routeSegment": "/:id/check-out",
              "params": ["id"]
            },
            {
              "name": "cancelBooking",
              "type": "logic",
              "method": "PATCH",
              "routeSegment": "/:id/cancel",
              "params": ["id"]
            }
          ],
          "dependencies": [] // Room model is an internal dependency
        }
        // ... more controller entries (Hotel, Room, Review, Payment)
      ]
    }
    \`\`\`

# Critical Rules:
1.  **STRICT JSON FORMAT:** Your entire output MUST be a valid JSON object matching the \`Output Format\` exactly, enclosed in a single markdown JSON block (\`\`\`json ... \`\`\`). Do not include any conversational text outside this JSON block.
2.  **ACCURATE PATHS:** Ensure \`modelPath\` values within \`dependencies\` for imports are correct relative to the controller file's location (e.g., \`../models/User.model.js\`). Assume controller files are in \`controllers/\` and models in \`models/\`.
3.  **FUNCTION MAPPING:** The \`exportedFunctions\` array is crucial for the Route Agent. Provide accurate \`name\`, \`type\`, \`method\`, \`routeSegment\`, and \`params\` for every function exported by the controller.
4.  **MINIMAL IMPORTS:** Only import necessary modules.
5.  **NO EXTERNAL COMMENTS:** Do not add any comments outside of the code strings in the JSON.
`;
};

export const controllerGenerator = async (
  modelAgentResponse: modelAgentResponseType,
  entityAgentResponse: EntityAgentResponseType,
  structureAgentResponse: StructureAgentResponseType
) => {
  try {
    console.log("Generating controllers...");
    const projectFolderPath = path.join(
      process.cwd(),
      structureAgentResponse.name
    );
    const controllersFolderPath = path.join(projectFolderPath, "controllers");

    
    try {
      await fs.access(projectFolderPath);
    } catch (error) {
      const errorMessage = `Error: Project folder "${structureAgentResponse.name}" does not exist at "${projectFolderPath}". Please ensure the project folder exists in your current working directory.`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

   
    try {
      await fs.mkdir(controllersFolderPath, { recursive: true });
      console.log(
        `Successfully ensured controllers folder exists: "${controllersFolderPath}"`
      );
    } catch (error) {
         console.log(
        `Controllers folder already exists: "${controllersFolderPath}"`
      );
      throw error;
     
    }

    console.log("Requesting controllers implementation from AI...");
    const response = await ai.models.generateContent({
      model: geminiModel,
      config: AgentsConfig.config(
        controllerGeneratorAgentSystemInstruction(
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
              text: `Generate complete controllers for all entities in the ${structureAgentResponse.name} project based on the provided input data and strict requirements. Ensure the output strictly follows the specified JSON format.`,
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

    const parsedResponse: ControllerAgentResponsePayload =
      JSON.parse(jsonString);

   
    for (const entry of parsedResponse.controllerCreationCode) {
      const filePath = path.join(projectFolderPath, entry.controllerPath);
      const directoryPath = path.dirname(filePath);

     
      await fs.mkdir(directoryPath, { recursive: true });
      await fs.writeFile(filePath, entry.code, "utf8");
      console.log(`✅Successfully wrote controller file: ${filePath}`);
    }

    return parsedResponse; 
  } catch (error) {
    console.error("Error in controller generation:", error);
    throw error;
  }
};
