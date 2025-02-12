import { Router } from "express";
import threadRouter from "../routes/threads"
import commentRouter from "../routes/comments"
import tagRouter from "../routes/tags";

const router: Router = Router();

router.use("/", threadRouter)
router.use("/tag", tagRouter)
router.use("/:threadId", commentRouter)

export default router;