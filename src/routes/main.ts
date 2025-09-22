import { Router } from "express";
import { submitQuestion } from "../controllers/submitQuestion";

const router: Router = Router();

router.post("/questions", submitQuestion);
router.get("/questions/");
router.get("/answers/:id");
router.get("/stream");


export default router;