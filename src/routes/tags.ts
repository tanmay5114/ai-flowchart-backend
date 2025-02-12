import { Router } from "express";
import { addTags } from "../controllers/tags";
import { adminToken } from "../middleware/admin_auth";

const tagRouter: Router = Router();

tagRouter.post("/add", adminToken , addTags)


export default tagRouter;