import * as express from "express";
import controller from "../controllers/ask_controller.js";


const askRouter = express.Router();

askRouter.get("/", controller);

export default askRouter;

