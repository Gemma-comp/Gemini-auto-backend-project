import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "dotenv";

config();

const apiKey: string = process.env.KEY ?? "";

const ai = new GoogleGenerativeAI(apiKey);

export const genAIModel = ai.getGenerativeModel({
    model: "gemini-pro"
})
