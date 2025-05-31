import fs from "fs/promises";
import path from "path";

import {
  StructureAgentResponseType,
  StructureFile,
} from "../../types/structure-agent-type.js";
import { MiddlewareAgentResponsePayload } from "./middleware-generator.js";
import { ControllerAgentResponsePayload } from "./controller-generator.js";
import { ai, geminiModel } from "../../utils/gemini-ai.js";
import AgentsConfig from "../../config/agents_config.js";

export type RouteCreationEntry = {
  routePath: string;
  code: string;
  description: string;
  dependencies: string[];
};

export type RouteAgentResponsePayload = {
  routeCreationCode: RouteCreationEntry[];
};

const routeGeneratorAgentSystemInstruction = (
  structureAgentResponse: StructureAgentResponseType,
  middlewareAgentResponse: MiddlewareAgentResponsePayload,
  controllerAgentResponse: ControllerAgentResponsePayload
) => {
  const routeFilesFromStructure: string[] = [];

  structureAgentResponse.files.forEach((file: StructureFile) => {
    if (
      file.type === "routes" &&
      file.path.startsWith("routes/") &&
      file.path.endsWith(".js")
    ) {
      routeFilesFromStructure.push(file.path);
    }
  });

  const availableControllers = controllerAgentResponse.controllerCreationCode
    .map((controllerFile) =>
      controllerFile.exportedFunctions
        .map(
          (func) =>
            `- \`${func.name}\` (from \`${controllerFile.controllerPath}\`)`
        )
        .join("\n")
    )
    .join("\n");

  const availableMiddlewares = middlewareAgentResponse.middlewareCreationCode
    .map((middlewareFile) =>
      middlewareFile.exportedFunctions
        .map(
          (func) =>
            `- \`${func.name}\` (from \`${middlewareFile.middlewarePath}\`)`
        )
        .join("\n")
    )
    .join("\n");

  return `
You are an expert Node.js Express.js route generator. Your primary task is to create the route files based on the specified project structure and correctly integrate the provided controller functions and middleware.

# Context and Input Data:

1.  **Project Name:** ${structureAgentResponse.name}

2.  **Project Structure (from Structure Agent):**
    This data explicitly defines the required directory and file structure, including the specific route files you need to generate.
    \`\`\`json
    ${JSON.stringify(structureAgentResponse.files, null, 2)}
    \`\`\`
    ${
      routeFilesFromStructure.length > 0
        ? `You MUST generate code for the following route files as specified in the structure:
${routeFilesFromStructure.map((p) => `- \`${p}\``).join("\n")}`
        : "The structure agent did not explicitly list route files. You should infer common route files based on the entities (e.g., `user.routes.js`, `product.routes.js`)."
    }

3.  **Generated Controller Functions (from Controller Agent):**
    These are the available controller functions, including their file paths, which you must import and use in the routes.
    \`\`\`json
    ${JSON.stringify(controllerAgentResponse, null, 2)}
    \`\`\`
    Available Controllers:
${availableControllers}

4.  **Generated Middleware Functions (from Middleware Agent):**
    These are the available middleware functions, including their file paths, which you must import and apply to relevant routes (e.g., \`authenticateJWT\` for protected routes, \`authorizeRoles\` for role-based access, validation middlewares).
    \`\`\`json
    ${JSON.stringify(middlewareAgentResponse, null, 2)}
    \`\`\`
    Available Middlewares:
${availableMiddlewares}

# Output Requirements:

1.  **Route File Generation:**
    * For each route file identified in the \`Project Structure\` (or inferred from entities if not specified), generate a complete Express.js router.
    * Use \`express.Router()\` for each route file.
    * Define RESTful API endpoints (GET, POST, PUT, DELETE) appropriate for the CRUD operations of each entity. Refer to the **Entities and their Fields and Operations** (from \`Entity Agent\` - although not directly passed to this instruction, you can infer based on the controllers/models).

2.  **Integration of Controllers:**
    * **Import** the necessary controller functions into each route file using ES Module syntax (\`import ... from '...';\`).
    * **Attach** the appropriate controller function as the final handler for each route.

3.  **Integration of Middleware:**
    * **Import** the necessary middleware functions into each route file.
    * **Apply** authentication middleware (like \`authenticateJWT\`) to routes that require user login.
    * **Apply** authorization middleware (like \`authorizeRoles\`) to routes that require specific user roles.
    * **Apply** validation middleware (like \`validateUserInput\`) to routes that process incoming data (e.g., POST and PUT requests).
    * Order middleware correctly: logging -> authentication -> authorization -> validation -> controller.

4.  **Error Handling:**
    * Ensure routes are robust. Use \`try...catch\` blocks in controller wrappers if direct Express async error handling is not set up globally, or rely on \`express-async-handler\` if implied by typical project setup (assume latter unless specified).
    * Routes should pass errors to the next middleware via \`next(error)\` for centralized error handling.

5.  **Module System:** Use ES Modules (\`import\`/\`export\`) throughout.

6.  **Example Output Structure:**
    Your final output **MUST** be a JSON object with a single key \`routeCreationCode\`, which is an array of objects. Each object in this array represents a route file.

    \`\`\`json
    {
      "routeCreationCode": [
        {
          "routePath": "routes/user.routes.js",
          "code": "import express from 'express';\\nimport { authenticateJWT, authorizeRoles } from '../middleware/auth.middleware.js';\\nimport { validateUserInput } from '../middleware/validateUserInput.middleware.js';\\nimport { createUser, getAllUsers, getUserById, updateUser, deleteUser } from '../controllers/user.controller.js';\\n\\nconst router = express.Router();\\n\\nrouter.post('/', authenticateJWT, authorizeRoles('admin'), validateUserInput, createUser);\\nrouter.get('/', authenticateJWT, authorizeRoles('admin', 'user'), getAllUsers);\\nrouter.get('/:id', authenticateJWT, getUserById);\\nrouter.put('/:id', authenticateJWT, authorizeRoles('admin'), validateUserInput, updateUser);\\nrouter.delete('/:id', authenticateJWT, authorizeRoles('admin'), deleteUser);\\n\\nexport default router;",
          "description": "API routes for user management.",
          "dependencies": ["express"]
        },
        {
          "routePath": "routes/product.routes.js",
          "code": "import express from 'express';\\nimport { authenticateJWT, authorizeRoles } from '../middleware/auth.middleware.js';\\nimport { createProduct, getAllProducts, getProductById, updateProduct, deleteProduct } from '../controllers/product.controller.js';\\n\\nconst router = express.Router();\\n\\nrouter.post('/', authenticateJWT, authorizeRoles('admin'), createProduct);\\nrouter.get('/', getAllProducts); // Public route\\nrouter.get('/:id', getProductById); // Public route\\nrouter.put('/:id', authenticateJWT, authorizeRoles('admin'), updateProduct);\\nrouter.delete('/:id', authenticateJWT, authorizeRoles('admin'), deleteProduct);\\n\\nexport default router;",
          "description": "API routes for product management.",
          "dependencies": ["express"]
        }
      ]
    }
    \`\`\`

# Critical Rules:
1.  **STRICT JSON FORMAT:** Your entire output **MUST** be a valid JSON object matching the \`Output Format\` exactly, enclosed in a single markdown JSON block (\`\`\`json ... \`\`\`). Do not include any conversational text outside this JSON block.
2.  **ACCURATE PATHS:** Ensure \`routePath\` values are correct. Assume routes files are in \`routes/\`.
3.  **CORRECT IMPORTS:** Accurately import controllers and middlewares using relative paths based on their provided \`middlewarePath\` and \`controllerPath\`.
4.  **APPLY MIDDLEWARE LOGICALLY:** Apply authentication for protected routes, authorization for restricted access, and validation for data input.
5.  **NO EXTERNAL COMMENTS:** Do not add any conversational text or comments outside of the JSON block.
`;
};

export const routeGenerator = async (
  structureAgentResponse: StructureAgentResponseType,
  middlewareAgentResponse: MiddlewareAgentResponsePayload,
  controllerAgentResponse: ControllerAgentResponsePayload
): Promise<RouteAgentResponsePayload> => {
  // Specify the return type
  try {
    console.log("Generating routes...");
    const projectFolderPath = path.join(
      process.cwd(),
      structureAgentResponse.name
    );

    const routesFolderPath = path.join(projectFolderPath, "routes");

    try {
      await fs.access(projectFolderPath);
    } catch (error: any) {
      const errorMessage = `Error: Project folder "${structureAgentResponse.name}" does not exist at "${projectFolderPath}". Please ensure the project folder exists in your current working directory.`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      await fs.mkdir(routesFolderPath, { recursive: true });
      console.log(
        `Successfully ensured routes folder exists: "${routesFolderPath}"`
      );
    } catch (error: any) {
      if (error.code !== "EEXIST") {
        console.error(
          `Error creating routes folder: "${routesFolderPath}"`,
          error
        );
        throw error;
      }
      console.log("Routes folder already exists.");
    }

    console.log("Requesting route files and implementation from AI...");
    const response = await ai.models.generateContent({
      model: geminiModel,
      config: AgentsConfig.config(
        routeGeneratorAgentSystemInstruction(
          structureAgentResponse,
          middlewareAgentResponse,
          controllerAgentResponse
        )
      ),
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Generate Express.js route files for the ${structureAgentResponse.name} project. Utilize the provided structure, controller functions, and middleware to create RESTful API endpoints. Ensure the output strictly follows the specified JSON format.`,
            },
          ],
        },
      ],
    });

    if (!response.text) {
      throw new Error("Empty response from AI model for routes generation.");
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
        "Empty JSON string after cleaning from AI response for routes generation."
      );
    }

    const parsedResponse: RouteAgentResponsePayload = JSON.parse(jsonString);

    for (const entry of parsedResponse.routeCreationCode) {
      const filePath = path.join(projectFolderPath, entry.routePath);
      const directoryPath = path.dirname(filePath);

      await fs.mkdir(directoryPath, { recursive: true });
      await fs.writeFile(filePath, entry.code, "utf8");
      console.log(`Successfully wrote route file: ${filePath}`);
    }

    console.log("Route files generated and written successfully.");
    return parsedResponse;
  } catch (error) {
    console.error("Error in route generation:", error);
    throw error;
  }
};
