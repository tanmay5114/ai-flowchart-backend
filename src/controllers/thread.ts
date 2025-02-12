import { Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../utils/AsyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { AuthRequest } from "../types/request";
import { addThreadSchema } from "../types/zodSchema";
import { ApiError } from "../utils/ApiError";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const addThread: RequestHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const parsedData = addThreadSchema.safeParse(req.body);
    const { userId, adminId } = req
    if (!parsedData.success) {
        throw new ApiError(400, "Some values are missing")
    }

    if (!userId && !adminId) {
        throw new ApiError(404, "Unauthorized")
    }

    const { content, tags } = parsedData.data;
    const thread = await prisma.thread.create({
        data: {
            content: content,
            role: adminId ? 1 : 0,
            userId: adminId ? null : userId,
            adminId: adminId ? adminId : null,
        }
    });

    if (!thread){
        throw new ApiError(400, "Thread not added")
    }
    
    res.status(200).json(new ApiResponse(200, "Successful", {message: "Thread added"} , true))
    return
})

