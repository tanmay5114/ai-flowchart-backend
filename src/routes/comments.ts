import { Router } from "express";
import { addComment, editComment, deleteComment } from "../controllers/comment";

const commentRouter: Router = Router();

commentRouter.post("/add", addComment)
commentRouter.put("/edit", editComment)
commentRouter.post("/delete", deleteComment)

export default commentRouter;