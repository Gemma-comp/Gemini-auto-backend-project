import cors from 'cors';
import { config } from 'dotenv';
import express from 'express';
import askRouter from 'src/Routes/ask_router';

config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3001;

app.get('/api/ask', askRouter);

app.listen(PORT, () => {
    console.log(`🚀🚀🚀 Server is running on port ${PORT}\n Visit http://localhost:${PORT}`);
});
