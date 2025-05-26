import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.KEY;
export const ai = new GoogleGenAI({ apiKey });
export const geminiModel = "gemini-2.5-flash-preview-05-20";
