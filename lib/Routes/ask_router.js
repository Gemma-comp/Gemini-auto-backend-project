import controller from "controllers/ask_controller";
import * as express from "express";
const askRouter = express.Router();
askRouter.post("/", controller);
export default askRouter;
//# sourceMappingURL=ask_router.js.map