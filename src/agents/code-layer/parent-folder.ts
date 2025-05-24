import AgentsConfig from "../../config/agents_config.js";
import { StructureAgentResponseType } from "../../types/structure-agent-type.js";
import { ai, geminiModel } from "../../utils/gemini-ai.js";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

const parentFolderCreationAgentSystemInstruction = (
  structure: StructureAgentResponseType
) => `
You are a parent folder creation expert for a node js app. Your task is to generate a complete and executable Node.js script that:

1. Creates a folder named: ${structure.name}

# Requirements:
- Use fs.mkdirSync with the recursive: true option to ensure all necessary parent directories are created.
- Include robust error handling to catch and report any issues during folder creation.
- The generated code must be a self-contained, executable Node.js script.
- **IMPORTANT:** Use ES Module (ESM) syntax (e.g., \`import fs from 'fs';\`, \`import path from 'path';\`) as the execution environment is an ES module.

# Project Structure Context:
${JSON.stringify(structure, null, 2)}

# Output Format:
\`\`\`javascript
// create-project.js
import fs from 'fs'; // Use import
import path from 'path'; // Use import

function initializeParentFolder(folderName) {
  try {
    const folderPath = path.join(process.cwd(), folderName); // Use process.cwd() for relative path from execution
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      console.log(\`[SUCCESS] Successfully created folder: \${folderPath}\`);
      return true;
    } else {
      console.log(\`[INFO] Folder already exists: \${folderPath}\`);
      return true;
    }
  } catch (error) {
    console.error(\`[ERROR] Error creating folder \${folderName}: \${error.message}\`);
    return false;
  }
}

// Execute the function with the target folder name and log its result
const isCreated = initializeParentFolder('${structure.name}');
if (!isCreated) {
  process.exit(1);
}
\`\`\`
`;

export const parentFolderCreationAgent = async (
  structureAgentResponse: StructureAgentResponseType
): Promise<boolean> => {
  try {
    console.log("--------- Creating Parent folder-------------");
    const response = await ai.models.generateContent({
      model: geminiModel,
      config: AgentsConfig.config(
        parentFolderCreationAgentSystemInstruction(structureAgentResponse)
      ),
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Generate the Node.js script to create the parent folder as specified in the instructions and structure data.",
            },
          ],
        },
      ],
    });

    if (!response.text) {
      throw new Error("Empty response from AI model");
    }

    let nodeCode = response.text;

    if (nodeCode.startsWith("```javascript")) {
      nodeCode = nodeCode.slice("```javascript".length).trim();
    }
    if (nodeCode.endsWith("```")) {
      nodeCode = nodeCode.slice(0, -3).trim();
    }

    const tempFileName = `temp_file_${Date.now()}.js`; //This go hold the executable node js code to create the parent folder name.
    const tempFilePath = path.join(process.cwd(), tempFileName);

    fs.writeFileSync(tempFilePath, nodeCode);
    console.log(`Generated script written to: ${tempFilePath}`);

    try {
      const { stdout, stderr } = await execPromise(`node "${tempFilePath}"`);

      console.log("Script stdout:", stdout);
      if (stderr) {
        console.error("Script stderr:", stderr);
      }

      const successMessage = `[SUCCESS] Successfully created folder: ${path.join(
        process.cwd(),
        structureAgentResponse.name
      )}`;
      const infoMessage = `[INFO] Folder already exists: ${path.join(
        process.cwd(),
        structureAgentResponse.name
      )}`;

      if (stdout.includes(successMessage) || stdout.includes(infoMessage)) {
        console.log(
          `Folder '${structureAgentResponse.name}' creation/existence confirmed.`
        );
        return true;
      } else {
        console.error(
          `Folder '${structureAgentResponse.name}' creation failed or status unclear.`
        );
        return false;
      }
    } catch (execError: any) {
      console.error(`Error executing script: ${execError.message}`);
      console.error("Script stdout (on error):", execError.stdout);
      console.error("Script stderr (on error):", execError.stderr);
      return false;
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        console.log(`Cleaned up temporary file: ${tempFilePath}`);
      }
    }
  } catch (error) {
    console.error("Error in parentFolderCreationAgent:", error);
    throw error;
  }
};
