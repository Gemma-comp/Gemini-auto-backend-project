import { GoogleGenerativeAI, GoogleGenerativeAIError } from "@google/generative-ai";
import { config } from "dotenv";

config();

const apiKey: string = process.env.KEY ?? "";

const ai = new GoogleGenerativeAI(apiKey);

const model = ai.getGenerativeModel({
    model: "gemini-pro"
})



const genCode = async (query: string) => {
    try {
        const prompt = query;
        const result = await model.generateContent(prompt);
        const response = await result.response;

        const candidates = response.candidates ?? [];

        return candidates[0].content.parts[0].text;
    } catch (error: unknown) {
        //We will handle all sort of errors like (Generative ai errors)
        if (error) {
            return error;
        }
    }
}


export default genCode;

