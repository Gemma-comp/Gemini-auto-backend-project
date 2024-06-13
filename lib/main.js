import cors from 'cors';
import { config } from 'dotenv';
import express from 'express';
config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const PORT = process.env.PORT || 3001;
app.get('/api/ask', (_req, res) => {
    res.status(200).json({ message: 'Hello from the server!' });
});
app.listen(PORT, () => {
    console.log(`🚀🚀🚀 Server is running on port ${PORT}\n Visit http://localhost:${PORT}`);
});
//# sourceMappingURL=main.js.map