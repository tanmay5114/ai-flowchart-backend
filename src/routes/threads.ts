import { Router } from "express";
import { addThread } from "../controllers/thread";
import { userToken } from "../middleware/user_auth";
import { adminToken } from "../middleware/admin_auth";

const threadRouter: Router = Router();

threadRouter.post("/add", userToken , adminToken , addThread)
// threadRouter.put("/edit", editThread)
// threadRouter.post("/delete", deleteThread)

export default threadRouter;