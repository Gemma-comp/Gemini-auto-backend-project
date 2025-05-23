import { NextFunction, Request, Response } from "express";
import { entityRecognitionAgent } from "../agents/entity-recognition.js";
import { structureGenerationAgent } from "../agents/structure-generation.js";
import { parentFolderCreationAgent } from "../agents/code-layer/parent-folder.js";

export const userInputController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    const entityResponse = await entityRecognitionAgent(prompt);
    const structureResponse = await structureGenerationAgent(entityResponse);
    const parentFolderAgentResponse = await parentFolderCreationAgent(
      structureResponse
    );

    return res.status(200).json(parentFolderAgentResponse);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Controller Error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: errorMessage,
    });
  }
};
