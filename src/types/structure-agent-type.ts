
export type StructureFile = {
  path: string; // Full path including filename (e.g., 'routes/user.routes.js')
  type: string; // The type of file (e.g., 'mongoose-model', 'controller', 'routes', 'auth-middleware')
};

export type StructureAgentResponseType = {
  name: string; // Project name
  files: StructureFile[]; // Array of all files with their paths and types
};