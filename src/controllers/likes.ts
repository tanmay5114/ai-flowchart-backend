import { Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../utils/AsyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { AuthRequest } from "../types/request";
import { likePostSchema } from "../types/zodSchema";
import { ApiError } from "../utils/ApiError";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const likeAPost: RequestHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const parsedData = likePostSchema.safeParse(req.body);
    const { userId, adminId } = req;
    const { parentId } = req.params;

    if (!parsedData.success) {
        throw new ApiError(400, `Validation failed: ${parsedData.error.errors.map(e => e.message).join(", ")}`);
    };

    if (!userId && !adminId) {
        throw new ApiError(401, "Unauthorized");
    };
    
    const parent = parsedData.data.parent;
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

    const isLikePresent = await prisma.likes.findFirst({
        where: {
          AND: [
            {
              OR: [
                { userId: parentId },
                { adminId: parentId }
              ]
            },
            {
              OR: [
                { threadId: parentContent.id },
                { commentId: parentContent.id }
              ]
            }
          ]
        },
        select: {
          id: true,
          status: true
        }
      });
      
      
      if (!isLikePresent) {
        await prisma.likes.create({
            data: {
                userId: userId ? userId : null,
                adminId: adminId ? adminId : null,
                threadId: parent === "thread" ? parentId : null,
                commentId: parent === "comment" ? parentId: null,
            }
        });
      } else {
        await prisma.likes.update({
            where: {
                id: isLikePresent.id
            },
            data: {
                status: isLikePresent.status === "ACTIVE" ? "UNACTIVE"  : "ACTIVE"
            }
        })
      };
    res.status(200).json(new ApiResponse(200, "Successful", { message: "Like / Unlike successfully" }, true));
    return
});