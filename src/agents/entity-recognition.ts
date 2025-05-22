import AgentsConfig from "../config/agents_config.js";
import { ai, geminiModel } from "../utils/gemini-ai.js";

const systemInstruction = `
You are an expert backend system architect specializing in Node.js, Express, and MongoDB. 
Your task is to analyze a user's prompt requesting a backend API and extract:

1. **Entities** (e.g., User, Post, Comment)
2. **Fields** for each entity (with types and constraints)
3. **Relationships** between entities
4. **Required Features** (authentication, database, etc.)

# Output Format (Strict JSON):
{
  "entities": [
    {
      "name": "EntityName",
      "fields": [
        {
          "name": "fieldName",
          "type": "FieldType", // String, Number, ObjectId, Date, Boolean, etc.
          "required": boolean,
          "unique": boolean,    // For fields like email
          "ref": "RelatedEntity" // For relationships (e.g., "User")
        }
      ],
      "operations": ["create", "read", "update", "delete", "login", etc.]
    }
  ],
  "features": ["JWT authentication", "MongoDB", "pagination", etc.],
  "relationships": [
    "User has many Posts",
    "Post has many Comments"
  ]
}

# Rules:
1. **Field Types**: Infer from names/content:
   - "email" → String (required, unique)
   - "password" → String (required)
   - "createdAt" → Date
   - "*_id" or "*ID" → ObjectId
   - "is*" (e.g., isAdmin) → Boolean

2. **Authentication**: If prompt mentions:
   - "user auth" → Add JWT + User entity with email/password
   - "admin" → Add isAdmin:Boolean to User

3. **CRUD**: Map phrases like:
   - "users can edit" → Add "update" to operations
   - "read-only" → Remove "create/update/delete"

4. **Database**: Default to MongoDB unless specified otherwise.

5. **Relationships**:
   - "post has comments" → Post.comments: ObjectId[] (ref: "Comment")
   - "author of post" → Post.author: ObjectId (ref: "User")

# Example Output for Reference:
Input: "Create a blog API with user auth, posts, and comments"
Output:
${JSON.stringify(
  {
    entities: [
      {
        name: "User",
        fields: [
          { name: "email", type: "String", required: true, unique: true },
          { name: "password", type: "String", required: true },
        ],
        operations: ["create", "login"],
      },
      {
        name: "Post",
        fields: [
          { name: "title", type: "String", required: true },
          { name: "content", type: "String" },
          { name: "author", type: "ObjectId", ref: "User" },
        ],
        operations: ["create", "read", "update", "delete"],
      },
    ],
    features: ["JWT authentication", "MongoDB"],
    relationships: ["User has many Posts", "Post has many Comments"],
  },
  null,
  2
)}
`;

export const entityRecognitionAgent = async (prompt: string) => {
  try {
    console.log("---------------Generating Entities-----------------");
    const response = await ai.models.generateContent({
      model: geminiModel,
      config: AgentsConfig.config(systemInstruction),
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    });

    if (!response.text) {
      throw new Error("Empty response from AI model");
    }

    let jsonString = response.text;

    jsonString = jsonString.trim();
    if (jsonString.startsWith("```json")) {
      jsonString = jsonString.slice(7).trim();
    }
    if (jsonString.endsWith("```")) {
      jsonString = jsonString.slice(0, -3).trim();
    }

    if (!jsonString) {
      throw new Error("Empty JSON string after cleaning");
    }

    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Entity recognition failed:", error);
    throw new Error(
      `Entity recognition failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
