import { Router } from "express";
import threadRouter from "../routes/threads"
import commentRouter from "../routes/comments"
import tagRouter from "../routes/tags";
import likeRouter from "./likeRouter";
import searchRouter from "./searchRouter";
import authRouter from "./authRouter";

const router: Router = Router();

router.use("/", threadRouter)
router.use("/tag", tagRouter)
router.use("/comments", commentRouter)
router.use("/like", likeRouter)
router.use("/search", searchRouter)
router.use("/auth", authRouter)


export default router;