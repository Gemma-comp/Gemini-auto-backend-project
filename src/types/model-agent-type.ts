export type ModelCreationEntry = {
  modelPath: string;
  code: string;
  exportName: string;
  dependencies: string[];
};

export type ModelAgentResponsePayload = {
  modelCreationCode: ModelCreationEntry[];
};


export type modelAgentResponseType = {
  message: string;
  agentResponse: ModelAgentResponsePayload;
};