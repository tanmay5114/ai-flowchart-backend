import { Router } from "express";
import { likeAPost } from "../controllers/likes"
import { userToken } from "../middleware/user_auth";
import { adminToken } from "../middleware/admin_auth";

const likeRouter: Router = Router();

likeRouter.post("/:parentId", userToken, adminToken, likeAPost)

export default likeRouter;