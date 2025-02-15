import { Router } from "express";
import { addThread, editThread, deleteThread, getAllThreads, getAllComments } from "../controllers/thread";
import { userToken } from "../middleware/user_auth";
import { adminToken } from "../middleware/admin_auth";

const threadRouter: Router = Router();

threadRouter.post("/add", userToken , addThread)
threadRouter.put("/:threadId", userToken, editThread)
threadRouter.delete("/:threadId", userToken , deleteThread)
threadRouter.get("/threads", userToken, getAllThreads)
threadRouter.get("/:threadId", userToken, getAllComments)

export default threadRouter;