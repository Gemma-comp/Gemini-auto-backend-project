import { GenerateContentConfig } from "@google/genai";

class AgentsConfig {
  static config = (
    systemInstruction: string
  ): GenerateContentConfig => {
    return {
      responseMimeType: "text/plain",
      systemInstruction: [
        {
          text: `${systemInstruction}`,
        },
      ],
    };
  };
}

export default AgentsConfig;
