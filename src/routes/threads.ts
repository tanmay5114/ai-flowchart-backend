import { Router } from "express";
import { addThread, editThread, deleteThread, getAllThreads, getAllComments } from "../controllers/thread";
import { userToken } from "../middleware/user_auth";
import { adminToken } from "../middleware/admin_auth";

const threadRouter: Router = Router();

threadRouter.post("/add", userToken , adminToken , addThread)
threadRouter.put("/:threadId", userToken, adminToken, editThread)
threadRouter.delete("/:threadId", userToken, adminToken , deleteThread)
threadRouter.get("/threads", userToken, adminToken, getAllThreads)
threadRouter.get("/:threadId", userToken, adminToken, getAllComments)

export default threadRouter;