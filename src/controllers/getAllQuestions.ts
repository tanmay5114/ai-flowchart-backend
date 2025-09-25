// controllers/questionController.ts
import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/AsyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

export const getAllQuestions: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { userId, page = 1, limit = 50, status } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100); // Max 100 items per page
    const skip = (pageNum - 1) * limitNum;

    try {
        // Build where clause
        const whereClause: any = {};
        
        if (userId) {
            whereClause.userId = userId as string;
        }
        
        if (status && ['pending', 'answered', 'failed'].includes(status as string)) {
            whereClause.status = status as string;
        }

        // Get questions with answers
        const questions = await prisma.question.findMany({
            where: whereClause,
            include: {
                answer: {
                    select: {
                        id: true,
                        answerText: false, // Don't include full text in list
                        createdAt: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip,
            take: limitNum
        });

        // Get total count for pagination
        const totalCount = await prisma.question.count({
            where: whereClause
        });

        const totalPages = Math.ceil(totalCount / limitNum);

        // Format response
        const formattedQuestions = questions.map(q => ({
            id: q.id,
            userId: q.userId,
            username: q.user.username,
            question: q.questionText,
            status: q.status,
            answerId: q.answer?.id || null,
            createdAt: q.createdAt,
            answeredAt: q.answer?.createdAt || null
        }));

        res.status(200).json(new ApiResponse(200, "Questions fetched successfully", {
            questions: formattedQuestions,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalCount,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            }
        }, true));

    } catch (error) {
        console.error('Error fetching questions:', error);
        throw new ApiError(500, "Failed to fetch questions");
    }
});

/**
 * GET /api/questions/:id - Get specific question with its answer and chart
 */
export const getQuestionById: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError(400, "Question ID is required");
    }

    try {
        const question = await prisma.question.findUnique({
            where: { id },
            include: {
                answer: {
                    include: {
                        chart: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            }
        });

        if (!question) {
            throw new ApiError(404, "Question not found");
        }

        res.status(200).json(new ApiResponse(200, "Question fetched successfully", {
            question: {
                id: question.id,
                userId: question.userId,
                username: question.user.username,
                question: question.questionText,
                status: question.status,
                answer: question.answer ? {
                    id: question.answer.id,
                    text: question.answer.answerText,
                    chart: question.answer.chart ? {
                        id: question.answer.chart.chartId,
                        title: question.answer.chart.title,
                        description: question.answer.chart.description,
                        chartDefinition: question.answer.chart.chartDefinition,
                        theme: question.answer.chart.theme
                    } : null,
                    createdAt: question.answer.createdAt
                } : null,
                createdAt: question.createdAt
            }
        }, true));

    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        console.error('Error fetching question:', error);
        throw new ApiError(500, "Failed to fetch question");
    }
});