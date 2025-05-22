import { config } from "dotenv";
import express from "express";
import { serverConfig } from "./config/server_config.js";
import { NextFunction, Request, Response } from "express";
import { userInputRouter } from "./Routes/user_input.js";

config();
const app = express();
serverConfig(app);

app.use(userInputRouter);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(
    `🚀🚀🚀 Server is running on port ${PORT}\nvisit http://localhost:${PORT}`
  );
});
