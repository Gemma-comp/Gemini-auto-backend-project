import path from "path";
import AgentsConfig from "../../config/agents_config.js";
import fs from "fs";
import { StructureAgentResponseType } from "../../types/structure-agent-type.js";
import { ai, geminiModel } from "../../utils/gemini-ai.js";
import { EntityAgentResponseType } from "../../types/entity-agent-type.js";
import { ModelAgentResponsePayload } from "../../types/model-agent-type.js";


const modelAgentSystemInstruction = (
  entityAgentResponse: EntityAgentResponseType,
  structureAgentResponse: StructureAgentResponseType
): string => {
  return `
You are an expert MongoDB/Mongoose schema designer. Generate complete model files for an ${
    structureAgentResponse.name
  } with these strict requirements:

# Input Data
1. ENTITIES: ${JSON.stringify(entityAgentResponse.entities, null, 2)}
2. RELATIONSHIPS: ${JSON.stringify(entityAgentResponse.relationships, null, 2)}
3. FEATURES: ${JSON.stringify(entityAgentResponse.features, null, 2)}

# Output Requirements
1. For EACH model in ${JSON.stringify(
    structureAgentResponse.files.filter((f) => f.type === "mongoose-model"),
    null,
    2
  )}:
    - Use ES modules (import/export)
    - Include schema definitions with all fields
    - Add proper indexes for query optimization
    - Implement relationship references (e.g., using mongoose.Schema.Types.ObjectId with ref)
    - Add timestamps automatically

2. Special Handling For:
    - User model: Include password hashing (e.g., using bcryptjs and a pre-save hook)
    - Order model: Add status validation (e.g., enum for status field)
    - Products: Implement inventory checks (e.g., default quantity, perhaps a virtual for stock status if needed)

3. Format:
\`\`\`json
{
  "modelCreationCode": [
    {
      "modelPath": "models/User.model.js",
      "code": "import mongoose from 'mongoose';\\n...",
      "exportName": "User",
      "dependencies": ["bcryptjs"] // List external npm packages required for this model
    }
  ]
}
\`\`\`

# Example Output
For a User model with email/password:
\`\`\`json
{
  "modelCreationCode": [
    {
      "modelPath": "models/User.model.js",
      "code": "import mongoose from 'mongoose';\\nimport bcrypt from 'bcryptjs';\\n\\nconst UserSchema = new mongoose.Schema({\\n  email: { type: String, required: true, unique: true },\\n  password: { type: String, required: true }\\n}, { timestamps: true });\\n\\nUserSchema.pre('save', async function(next) {\\n  if (!this.isModified('password')) return next();\\n  this.password = await bcrypt.hash(this.password, 12);\\n  next();\\n});\\n\\nexport default mongoose.model('User', UserSchema);",
      "exportName": "User",
      "dependencies": ["bcryptjs"]
    }
  ]
}
\`\`\`

# Critical Rules
1. ALL field definitions must match entity specifications exactly.
2. Include proper virtuals for relationships where beneficial (e.g., for 'populate' functionality).
3. Add schema validation where appropriate (e.g., min/max length, enum, custom validators).
4. Never include controller logic - pure schema definitions and associated middleware/hooks only.
5. The generated JSON must be valid and strictly adhere to the Output Format.
`;
};

export const modelGenerator = async (
  entityAgentResponse: EntityAgentResponseType,
  structureAgentResponse: StructureAgentResponseType
): Promise<string> => {
  try {
    console.log("Generating database models...");
    const projectFolderPath = path.join(
      process.cwd(),
      structureAgentResponse.name
    );
    const modelsFolderPath = path.join(projectFolderPath, "models");

    if (!fs.existsSync(projectFolderPath)) {
      const errorMessage = `Error: Project folder "${structureAgentResponse.name}" does not exist at "${projectFolderPath}". Please ensure the project folder exists in your current working directory.`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    if (!fs.existsSync(modelsFolderPath)) {
      console.log(`Creating models folder: "${modelsFolderPath}"`);
      fs.mkdirSync(modelsFolderPath, { recursive: true });
      console.log(`Successfully created models folder: "${modelsFolderPath}"`);
    } else {
      console.log(`Models folder already exists: "${modelsFolderPath}"`);
    }

    console.log("Requesting model schemas from AI...");
    const response = await ai.models.generateContent({
      model: geminiModel,
      config: AgentsConfig.config(
        modelAgentSystemInstruction(entityAgentResponse, structureAgentResponse)
      ),
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Generate complete Mongoose models for all entities in the ${structureAgentResponse.name} project based on the provided input data and strict requirements. Ensure the output strictly follows the specified JSON format.`,
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

    const modelPayload: ModelAgentResponsePayload = JSON.parse(jsonString);

    console.log("Writing generated model files...");
    for (const modelEntry of modelPayload.modelCreationCode) {
      const filePath = path.join(projectFolderPath, modelEntry.modelPath);
      const directory = path.dirname(filePath);

      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
        console.log(`Created sub-directory for model: ${directory}`);
      }

      fs.writeFileSync(filePath, modelEntry.code);
      console.log(`✅ Successfully wrote model file: ${filePath}`);
    }

    console.log("Database models generation and writing complete.");
    return "Models generated and written successfully.";
  } catch (error: any) {
    console.error("Fatal error in modelGenerator:", error);
    throw new Error(`Failed to generate and write models: ${error.message}`);
  }
};
