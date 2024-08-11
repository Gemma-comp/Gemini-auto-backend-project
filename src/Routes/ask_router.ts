import * as express from "express";
import controller from "../controllers/ask_controller.js";


const getRouter = express.Router();

getRouter.post("/", controller);

export default getRouter;

