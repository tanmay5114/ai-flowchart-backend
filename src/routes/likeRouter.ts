import { Router } from "express";
import { likeAPost } from "../controllers/likes"

const likeRouter: Router = Router();

likeRouter.post("/:parentId", likeAPost)

export default likeRouter;