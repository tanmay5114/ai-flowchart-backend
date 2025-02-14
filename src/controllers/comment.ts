import { Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../utils/AsyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { AuthRequest } from "../types/request";
import { addCommentSchema, editCommentSchema } from "../types/zodSchema";
import { ApiError } from "../utils/ApiError";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const addComment: RequestHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const parsedData = addCommentSchema.safeParse(req.body);
    const { userId, adminId } = req;
    const { parentId } = req.params;

    if (!parsedData.success) {
        throw new ApiError(400, `Validation failed: ${parsedData.error.errors.map(e => e.message).join(", ")}`);
    };

    if (!userId && !adminId) {
        throw new ApiError(401, "Unauthorized");
    };

    const { content, parent } = parsedData.data;
    let parentContent;
    if (parent === "thread") {
        parentContent = await prisma.thread.findUnique({
            where: {
                id: parentId
            },
            select: {
                id: true
            }
        });
    } else {
        parentContent = await prisma.comment.findUnique({
            where: {
                id: parentId
            },
            select: {
                id: true
            }
        });
    }

    if (!parentContent) {
        throw new ApiError(404, "Thread/Comment not found")
    }

    await prisma.comment.create({
        data: {
            content,
            role: adminId ? 1 : 0,
            userId: userId || null,
            adminId: adminId || null,
            commentId: parent === "comment" ? parentId : null,
            threadId: parent === "thread" ? parentId : null,
        }
    });

    res.status(200).json(new ApiResponse(200, "Successful", { message: "Comment added" }, true));
    return
});
 
export const editComment: RequestHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const parsedData = editCommentSchema.safeParse(req.body);
    const { userId, adminId } = req;
    const { commentId } = req.params

    if (!parsedData.success) {
        throw new ApiError(400, `Validation failed: ${parsedData.error.errors.map(e => e.message).join(", ")}`);
    };

    if (!userId && !adminId) {
        throw new ApiError(404, "Unauthorized");
    };

    const { content } = parsedData.data;

    const currentComment = await prisma.comment.findUnique({
        where: {
            id: commentId,
        },
        select: {
            userId: true
        }
    });

    if (!currentComment) {
        throw new ApiError(400, "Comment not available")
    }

    if (userId && currentComment.userId !== userId) {
        throw new ApiError(401, "Unauthorized")
    }

    await prisma.comment.update({
        where: {
            id: commentId
        },
        data: {
            content,
        }
    });
    res.status(200).json(new ApiResponse(200, "Successful", { message: "Comment updated" }, true));
    return
});

export const deleteComment: RequestHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId, adminId } = req;
    const { commentId } = req.params

    if (!userId && !adminId) {
        throw new ApiError(401, "Unauthorized");
    };

    const currentComment = await prisma.comment.findUnique({
        where: {
            id: commentId,
        },
        select: {
            userId: true,
        }
    });

    if (!currentComment) {
        throw new ApiError(400, "Comment not available")
    }

    if (userId && currentComment.userId !== userId) {
        throw new ApiError(401, "Unauthorized")
    }

    await prisma.comment.delete({
        where: {
            id: commentId
        }
    });
    res.status(200).json(new ApiResponse(200, "Successful", { message: "Comment Deleted" }, true));
    return
});