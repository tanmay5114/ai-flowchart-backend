import { Request, Response, RequestHandler } from "express";
import { AuthRequest } from "../types/request";
import { asyncHandler } from "../utils/AsyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";

export const submitQuestion: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { userId, question } = req.body;

    if (!userId || !question) {
        throw new ApiError(400, "User or question is not present");
    };

    res.status(200).json(new ApiResponse(200, "Successful", { message: "Question submitted" }, true));
    return
});