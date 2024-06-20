import * as express from "express";
import controller from "../controllers/ask_controller.js";


const askRouter = express.Router();

askRouter.post("/", controller);

export default askRouter;
