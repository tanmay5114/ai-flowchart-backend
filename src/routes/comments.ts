import { Router } from "express";
import { userToken } from "../middleware/user_auth";
import { adminToken } from "../middleware/admin_auth";
import { addComment, deleteComment, editComment } from "../controllers/comment";

const commentRouter: Router = Router();

commentRouter.post("/:parentId", userToken , adminToken, addComment)
commentRouter.put("/:commentId", userToken, adminToken, editComment)
commentRouter.delete("/:commentId", userToken, adminToken, deleteComment )
// commentRouter.get("/:parentId", userToken, adminToken) 

export default commentRouter;