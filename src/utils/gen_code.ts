import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "dotenv";

config();

const apiKey: string = process.env.KEY ?? "";

const ai = new GoogleGenerativeAI(apiKey);

const model = ai.getGenerativeModel({
    model: "gemini-pro"
})



const genCode = async (query: string) => {
    try {
        const prompt = `You are serving as a backend controller code generator. Generate a code that fetches all documents from ${query} collection. You are to, 1. import mongoose from mongoose 2.Create a database connection to 'mongodb+srv://thebighouse:thebighouse@thebighouse.ipiyiro.mongodb.net/thebighouse'. 3. Ater the connection is successful, you write a mongoose query to get all docs in the ${query} collection. 4. Log the result of the query to the console 5. If there is any error, you log it to the console as well. An example is  import mongoose from 'mongoose'; mongoose.connect('mongodb+srv://thebighouse:thebighouse@thebighouse.ipiyiro.mongodb.net/thebighouse').then(() => mongoose.connection.db.collection('users').find().toArray()).then(result => { console.log(result); mongoose.disconnect(); }).catch(err => console.log('Error:', err)); The example above is a sample code to fetch documents in the users collection, You can follow this same code to write yours. Do not add any \'\'\'javascript or description, just return the code alone.`;
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

