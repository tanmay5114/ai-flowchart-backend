// controllers/answerController.ts
import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/AsyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

/**
 * GET /api/answers/:id - Fetch both explanation text and chart for an answer
 */
export const getAnswerById: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError(400, "Answer ID is required");
    }

    try {
        const answer = await prisma.answer.findUnique({
            where: { id },
            include: {
                question: {
                    select: {
                        id: true,
                        questionText: true,
                        userId: true,
                        createdAt: true
                    }
                },
                chart: true
            }
        });

        if (!answer) {
            throw new ApiError(404, "Answer not found");
        }

        // Format the response for Mermaid charts
        const responseData = {
            id: answer.id,
            questionId: answer.questionId,
            question: answer.question.questionText,
            text: answer.answerText,
            chart: answer.chart ? {
                id: answer.chart.chartId,
                title: answer.chart.title,
                description: answer.chart.description,
                chartDefinition: answer.chart.chartDefinition,
                theme: answer.chart.theme
            } : null,
            createdAt: answer.createdAt
        };

        res.status(200).json(new ApiResponse(200, "Answer fetched successfully", responseData, true));

    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        console.error('Error fetching answer:', error);
        throw new ApiError(500, "Failed to fetch answer");
    }
});

/**
 * GET /api/answers - Get all answers with optional filters
 */
export const getAllAnswers: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { userId, page = 1, limit = 20, hasChart } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 50); // Max 50 items per page
    const skip = (pageNum - 1) * limitNum;

    try {
        // Build where clause
        const whereClause: any = {};
        
        if (userId) {
            whereClause.question = {
                userId: userId as string
            };
        }

        // Filter by whether answer has chart
        if (hasChart === 'true') {
            whereClause.chart = { isNot: null };
        } else if (hasChart === 'false') {
            whereClause.chart = null;
        }

        const answers = await prisma.answer.findMany({
            where: whereClause,
            include: {
                question: {
                    select: {
                        id: true,
                        questionText: true,
                        userId: true
                    }
                },
                chart: {
                    select: {
                        chartId: true,
                        title: true,
                        theme: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip,
            take: limitNum
        });

        const totalCount = await prisma.answer.count({
            where: whereClause
        });

        const totalPages = Math.ceil(totalCount / limitNum);

        // Format response - summary view without full text
        const formattedAnswers = answers.map(answer => ({
            id: answer.id,
            questionId: answer.questionId,
            question: answer.question.questionText,
            userId: answer.question.userId,
            hasChart: !!answer.chart,
            chartTitle: answer.chart?.title || null,
            textPreview: answer.answerText.substring(0, 150) + (answer.answerText.length > 150 ? '...' : ''),
            createdAt: answer.createdAt
        }));

        res.status(200).json(new ApiResponse(200, "Answers fetched successfully", {
            answers: formattedAnswers,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalCount,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            }
        }, true));

    } catch (error) {
        console.error('Error fetching answers:', error);
        throw new ApiError(500, "Failed to fetch answers");
    }
});

/**
 * GET /api/answers/:id/chart - Get only the chart data
 */
export const getChartById: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError(400, "Answer ID is required");
    }

    try {
        const answer = await prisma.answer.findUnique({
            where: { id },
            include: {
                chart: true
            }
        });

        if (!answer) {
            throw new ApiError(404, "Answer not found");
        }

        if (!answer.chart) {
            throw new ApiError(404, "Chart not found for this answer");
        }

        // Return chart data
        const chartData = {
            id: answer.chart.chartId,
            title: answer.chart.title,
            description: answer.chart.description,
            chartDefinition: answer.chart.chartDefinition,
            theme: answer.chart.theme,
            createdAt: answer.chart.createdAt
        };

        res.status(200).json(new ApiResponse(200, "Chart fetched successfully", {
            chart: chartData
        }, true));

    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        console.error('Error fetching chart:', error);
        throw new ApiError(500, "Failed to fetch chart");
    }
});

/**
 * GET /api/charts/:chartId - Get chart by chart ID directly
 */
export const getChartByChartId: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { chartId } = req.params;

    if (!chartId) {
        throw new ApiError(400, "Chart ID is required");
    }

    try {
        const chart = await prisma.chart.findUnique({
            where: { chartId },
            include: {
                answer: {
                    include: {
                        question: {
                            select: {
                                questionText: true,
                                userId: true
                            }
                        }
                    }
                }
            }
        });

        if (!chart) {
            throw new ApiError(404, "Chart not found");
        }

        const responseData = {
            id: chart.chartId,
            title: chart.title,
            description: chart.description,
            chartDefinition: chart.chartDefinition,
            theme: chart.theme,
            createdAt: chart.createdAt,
            context: {
                questionText: chart.answer.question.questionText,
                answerText: chart.answer.answerText,
                userId: chart.answer.question.userId
            }
        };

        res.status(200).json(new ApiResponse(200, "Chart fetched successfully", responseData, true));

    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        console.error('Error fetching chart by chartId:', error);
        throw new ApiError(500, "Failed to fetch chart");
    }
});

/**
 * GET /api/charts - Get all charts with optional filters
 */
export const getAllCharts: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { theme, page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 50);
    const skip = (pageNum - 1) * limitNum;

    try {
        const whereClause: any = {};
        
        if (theme) {
            whereClause.theme = theme as string;
        }

        const charts = await prisma.chart.findMany({
            where: whereClause,
            include: {
                answer: {
                    include: {
                        question: {
                            select: {
                                questionText: true,
                                userId: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip,
            take: limitNum
        });

        const totalCount = await prisma.chart.count({ where: whereClause });
        const totalPages = Math.ceil(totalCount / limitNum);

        const formattedCharts = charts.map(chart => ({
            id: chart.chartId,
            title: chart.title,
            description: chart.description,
            theme: chart.theme,
            questionPreview: chart.answer.question.questionText.substring(0, 100) + '...',
            createdAt: chart.createdAt
        }));

        res.status(200).json(new ApiResponse(200, "Charts fetched successfully", {
            charts: formattedCharts,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalCount,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            }
        }, true));

    } catch (error) {
        console.error('Error fetching charts:', error);
        throw new ApiError(500, "Failed to fetch charts");
    }
});