import { GenerateContentConfig } from "@google/genai";

class AgentsConfig {
  static config = (
    systemInstruction: string,
    tools?: []
  ): GenerateContentConfig => {
    return {
      responseMimeType: "text/plain",
      systemInstruction: [
        {
          text: `${systemInstruction}`,
        },
      ],
      tools: tools,
    };
  };
}

export default AgentsConfig;
