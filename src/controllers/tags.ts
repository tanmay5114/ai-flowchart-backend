import { Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../utils/AsyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { AuthRequest } from "../types/request";
import { PrismaClient } from "@prisma/client";
import { addTagSchema } from "../types/zodSchema";
import { ApiError } from "../utils/ApiError";

const prisma = new PrismaClient();

export const addTags: RequestHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const parsedData = addTagSchema.safeParse(req.body);
    const adminId = req.adminId
    if (!parsedData.success) {
        throw new ApiError(400, "Please enter the tag name")
    }

    if (!adminId) {
        throw new ApiError(404, "Unauthorized")
    }

    const tagName = parsedData.data.tagName;
    const tag = await prisma.tags.create({
        data: {
            tagName: tagName
        }
    });

    if (!tag){
        throw new ApiError(400, "Tag not added")
    }
    
    res.status(200).json(new ApiResponse(200, "Successful", {message: "Tag added"} , true))
    return
})

