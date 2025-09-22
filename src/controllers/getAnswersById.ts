// controllers/answerController.ts
import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/AsyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

/**
 * GET /api/answers/:id - Fetch both explanation text and visualization for an answer
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
                visualization: {
                    include: {
                        layers: {
                            include: {
                                animations: true
                            },
                            orderBy: {
                                orderIndex: 'asc'
                            }
                        }
                    }
                }
            }
        });

        if (!answer) {
            throw new ApiError(404, "Answer not found");
        }

        // Format the response according to your spec
        const responseData = {
            id: answer.id,
            questionId: answer.questionId,
            question: answer.question.questionText,
            text: answer.answerText,
            visualization: answer.visualization ? {
                id: answer.visualization.id,
                duration: answer.visualization.duration,
                fps: answer.visualization.fps,
                metadata: answer.visualization.metadata,
                layers: answer.visualization.layers.map(layer => ({
                    id: layer.layerId,
                    type: layer.type,
                    props: layer.props,
                    animations: layer.animations.map(anim => ({
                        property: anim.property,
                        from: anim.fromValue,
                        to: anim.toValue,
                        start: anim.startTime,
                        end: anim.endTime,
                        easing: anim.easing
                    }))
                }))
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
    const { userId, page = 1, limit = 20, hasVisualization } = req.query;

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

        // Filter by whether answer has visualization
        if (hasVisualization === 'true') {
            whereClause.visualization = { isNot: null };
        } else if (hasVisualization === 'false') {
            whereClause.visualization = null;
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
                visualization: {
                    select: {
                        id: true,
                        duration: true,
                        fps: true
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
            hasVisualization: !!answer.visualization,
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
 * GET /api/answers/:id/visualization - Get only the visualization data
 */
export const getVisualizationById: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError(400, "Answer ID is required");
    }

    try {
        const answer = await prisma.answer.findUnique({
            where: { id },
            include: {
                visualization: {
                    include: {
                        layers: {
                            include: {
                                animations: true
                            },
                            orderBy: {
                                orderIndex: 'asc'
                            }
                        }
                    }
                }
            }
        });

        if (!answer) {
            throw new ApiError(404, "Answer not found");
        }

        if (!answer.visualization) {
            throw new ApiError(404, "Visualization not found for this answer");
        }

        // Format visualization according to your spec
        const visualizationData = {
            id: answer.visualization.id,
            duration: answer.visualization.duration,
            fps: answer.visualization.fps,
            metadata: answer.visualization.metadata,
            layers: answer.visualization.layers.map(layer => ({
                id: layer.layerId,
                type: layer.type,
                props: layer.props,
                animations: layer.animations.map(anim => ({
                    property: anim.property,
                    from: anim.fromValue,
                    to: anim.toValue,
                    start: anim.startTime,
                    end: anim.endTime,
                    easing: anim.easing
                }))
            }))
        };

        res.status(200).json(new ApiResponse(200, "Visualization fetched successfully", {
            visualization: visualizationData
        }, true));

    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        console.error('Error fetching visualization:', error);
        throw new ApiError(500, "Failed to fetch visualization");
    }
});