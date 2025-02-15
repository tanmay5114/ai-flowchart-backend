import { Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../utils/AsyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { AuthRequest } from "../types/request";
import { addThreadSchema, editThreadSchema } from "../types/zodSchema";
import { ApiError } from "../utils/ApiError";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const addThread: RequestHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const parsedData = addThreadSchema.safeParse(req.body);
    const { userId, adminId } = req;
    console.log("this is uswrid, use", userId);
    console.log("this is admin id", adminId);

    if (!parsedData.success) {
        throw new ApiError(400, "Some values are missing");
    };

    if (!userId && !adminId) {
        throw new ApiError(404, "Unauthorized");
    };

    const { content, tags } = parsedData.data;

    const uniqueTags = Array.from(new Set(
        (tags?.split(',') || []).map(tag => parseInt(tag.trim())).filter(Boolean)
    ));

    console.log(uniqueTags, "this is unique tags");

    await prisma.thread.create({
        data: {
            content,
            role: adminId ? 1 : 0,
            userId: userId || null,
            adminId: adminId || null,
            tags: {
                connect: uniqueTags.map(id => ({ id }))
            }
        }
    });

    res.status(200).json(new ApiResponse(200, "Successful", { message: "Thread added" }, true));
    return
});


export const editThread: RequestHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const parsedData = editThreadSchema.safeParse(req.body);
    const { userId, adminId } = req;
    const { threadId } = req.params

    if (!parsedData.success) {
        throw new ApiError(400, "Some values are missing");
    };

    const { content, tags } = parsedData.data;

    if (!content && !tags) {
        throw new ApiError(400, "Bad Request")
    } // change it in the case of image url

    if (!userId && !adminId) {
        throw new ApiError(404, "Unauthorized");
    };

    const currentThread = await prisma.thread.findUnique({
        where: {
            id: threadId,
        },
        select: {
            userId: true,
            tags: {
                select: {
                    id: true
                }
            }
        }
    });

    if (!currentThread) {
        throw new ApiError(400, "Thread not available")
    }

    if (userId && currentThread.userId !== userId) {
        throw new ApiError(404, "Unauthorized")
    }
    let updatedTags = undefined;

    if (tags) {
        const tagIds = Array.isArray(tags) 
            ? tags.map(tag => parseInt(tag))
            : tags.split(',').map(tag => parseInt(tag.trim())).filter(Boolean);
        const uniqueTags = [...new Set(tagIds)];
        updatedTags = { set: uniqueTags.map(id => ({ id })) };
    }

    await prisma.thread.update({
        where: {
            id: threadId
        },
        data: {
            content,
            tags: updatedTags
        }
    })

    res.status(200).json(new ApiResponse(200, "Successful", { message: "Thread updated" }, true));
    return
});

export const deleteThread: RequestHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId, adminId } = req;
    const { threadId } = req.params

    if (!userId && !adminId) {
        throw new ApiError(404, "Unauthorized");
    };

    const currentThread = await prisma.thread.findUnique({
        where: {
            id: threadId,
        },
        select: {
            userId: true,
        }
    });

    if (!currentThread) {
        throw new ApiError(400, "Thread not available")
    }

    if (userId && currentThread?.userId !== userId) {
        throw new ApiError(404, "Unauthorized")
    }

    await prisma.thread.delete({
        where: {
            id: threadId
        }
    });
    res.status(200).json(new ApiResponse(200, "Successful", { message: "Thread Deleted" }, true));
    return
});

export const getAllThreads: RequestHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId, adminId } = req;
    if (!userId && !adminId) {
        throw new ApiError(404, "Unauthorized");
    };

    const threads = await prisma.thread.findMany({
        skip: 0,
        take: 10,
        include: {
            comments: {
                select: {
                    id: true
                }
            }
        }
    });
    res.status(200).json(new ApiResponse(200, "Successful", { threads: threads }, true));
    return
});

export const getAllComments: RequestHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId, adminId } = req;
    const { threadId } = req.params

    if (!userId && !adminId) {
        throw new ApiError(404, "Unauthorized");
    };

    const currentThread = await prisma.thread.count({
        where: {
            id: threadId,
        },
    });

    if (currentThread <= 0) {
        throw new ApiError(400, "Thread not available")
    }

    const threads = await prisma.comment.findMany({
        where: {
            OR: [
                { threadId: threadId },
                { commentId: threadId }
            ],
        },
        orderBy: {
            updatedAt: 'desc',
        },
        skip: 0,
        take: 10,
        include: {
            comments: {
                select: {
                    id: true
                }
            }
        }
    });
    res.status(200).json(new ApiResponse(200, "Successful", { threads: threads }, true));
    return
});