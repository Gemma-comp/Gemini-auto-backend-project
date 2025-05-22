import { Router } from "express";
import { userInputController } from "../controllers/user_input.js";

export const userInputRouter = Router();

userInputRouter.post("/", userInputController);
