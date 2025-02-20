import { Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../utils/AsyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { AuthRequest } from "../types/request";
import { ApiError } from "../utils/ApiError";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const searchApi: RequestHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId, adminId } = req;

    if (!userId && !adminId) {
        throw new ApiError(401, "Unauthorized");
    };

    const { search_query = '' , page = '1' , limit = '10' } = req.query as { search_query?: string, page?: string, limit?: string }
    
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const results = await prisma.thread.findMany({
        where: {
            OR: [
                { admin: { username: { contains: search_query, mode: "insensitive" } }},
                { user: { username: { contains: search_query, mode: "insensitive" } } },
                { content: {contains: search_query, mode: "insensitive"}},
                { comments: { some: { content: { contains: search_query, mode: "insensitive" } } } },
                { imageUrl: { contains: search_query, mode: "insensitive" } },
                { comments: { some: { imageUrl: { contains: search_query, mode: "insensitive" } } } },
            ]
        },
        include: {
            user: true,
            admin: true,
            comments: true
        },
        orderBy: [
            { admin: { username: "asc" }},
            { user: {username: "asc" }},
            { content: "asc" },
            { comments: {_count: "desc" } },
            { imageUrl: "asc"},
        ],
        skip,
        take: limitNumber,
    });

    res.status(200).json(new ApiResponse(200, "Successful", { message: results }, true));
    return
});