import cors from 'cors';
import { config } from 'dotenv';
import express from 'express';
import getRouter from './Routes/ask_router.js';

config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3001;

app.use('/api/get', getRouter);//Get collections
// app.use("/api/post") //Add data to collections
// app.use("/api/delete")

app.listen(PORT, () => {
    console.log(`🚀🚀🚀 Server is running on port ${PORT}\nvisit http://localhost:${PORT}`);
});
