// controllers/userController.ts
import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/AsyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

export const createAUser: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const username = req.body.username;
    if (!username){
        throw new ApiError(400, "Username not given");
    }

    try {
        const user = await prisma.user.create({
            data: {
                username: username
            }
        })

        res.status(200).json(new ApiResponse(200, "User created successfully", {
            user: user,
        }, true));

    } catch (error) {
        console.error('Error creating users:', error);
        throw new ApiError(500, "Failed to create user");
    }
});

/**
 * GET /api/users/:id - Get user profile with stats
 */
export const getUserById: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError(400, "User ID is required");
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                questions: {
                    include: {
                        answer: {
                            select: {
                                id: true,
                                createdAt: true,
                                chart: { // ✅ Fixed: changed from visualization
                                    select: {
                                        id: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 10 // Recent 10 questions
                }
            }
        });

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // Calculate stats
        const totalQuestions = await prisma.question.count({
            where: { userId: id }
        });

        const answeredQuestions = await prisma.question.count({
            where: { userId: id, status: 'answered' }
        });

        const questionsWithVisualizations = await prisma.question.count({
            where: { 
                userId: id,
                answer: {
                    chart: { // ✅ Fixed: changed from visualization
                        isNot: null
                    }
                }
            }
        });

        const responseData = {
            id: user.id,
            username: user.username,
            createdAt: user.createdAt,
            stats: {
                totalQuestions,
                answeredQuestions,
                questionsWithVisualizations,
                answerRate: totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0
            },
            recentQuestions: user.questions.map(q => ({
                id: q.id,
                question: q.questionText,
                status: q.status,
                hasAnswer: !!q.answer,
                hasVisualization: !!q.answer?.chart, // ✅ Fixed: changed from visualization
                createdAt: q.createdAt,
                answeredAt: q.answer?.createdAt || null
            }))
        };

        res.status(200).json(new ApiResponse(200, "User profile fetched successfully", responseData, true));

    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        console.error('Error fetching user:', error);
        throw new ApiError(500, "Failed to fetch user profile");
    }
});

/**
 * GET /api/users - Get all users (admin endpoint)
 */
export const getAllUsers: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);
    const skip = (pageNum - 1) * limitNum;

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                createdAt: true,
                _count: {
                    select: {
                        questions: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip,
            take: limitNum
        });

        const totalCount = await prisma.user.count();
        const totalPages = Math.ceil(totalCount / limitNum);

        const formattedUsers = users.map(user => ({
            id: user.id,
            username: user.username,
            questionCount: user._count.questions,
            createdAt: user.createdAt
        }));

        res.status(200).json(new ApiResponse(200, "Users fetched successfully", {
            users: formattedUsers,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalCount,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            }
        }, true));

    } catch (error) {
        console.error('Error fetching users:', error);
        throw new ApiError(500, "Failed to fetch users");
    }
});