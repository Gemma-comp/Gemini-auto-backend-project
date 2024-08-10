import { genAIModel } from "./gemini_config.js";

export const modifyDBResponse = async (responseData: string) => {
    try {
        const prompt: string = `${responseData} \n This is a response gotten from a db direct, Modify this to be an actual JSON response returned as a backend developer without adding explanations or whatsoever.`;
        const result = await genAIModel.generateContent(prompt);
        const response = await result.response;

        const candidates = response.candidates ?? [];

       
        return candidates[0].content.parts[0].text?.toString();
    } catch (error) {
        if (error) {
            return error;
        }
    }
}