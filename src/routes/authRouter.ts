import { Router } from "express";
import { addAdmin, addUser } from "../controllers/auth";

const authRouter: Router = Router();

authRouter.post("/login", addUser)
authRouter.post("/admin/login", addAdmin)

export default authRouter;