import controller from "src/controllers/ask_controller";
import * as express from "express";

const askRouter = express.Router();

askRouter.post("/", controller);



export default askRouter;