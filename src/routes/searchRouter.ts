import { Router } from "express";
import { userToken } from "../middleware/user_auth";
import { searchApi } from "../controllers/search";

const searchRouter: Router = Router();

searchRouter.get("/", userToken, searchApi)

export default searchRouter