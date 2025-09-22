import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/AsyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { PrismaClient } from "../generated/prisma";
import { llmService, LLMResponse } from "../services/llm";
import { sseService } from "../services/sse";

const prisma = new PrismaClient();

export const submitQuestion: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { userId, question } = req.body;

    // Input validation
    if (!userId || !question) {
        throw new ApiError(400, "UserId and question are required");
    }

    if (typeof question !== 'string' || question.trim().length === 0) {
        throw new ApiError(400, "Question must be a non-empty string");
    }

    if (question.trim().length > 1000) {
        throw new ApiError(400, "Question is too long (max 1000 characters)");
    }

    try {
        // 1. Ensure user exists
        const user = await ensureUserExists(userId);

        // 2. Create and save question
        const savedQuestion = await prisma.question.create({
            data: {
                userId: user.id,
                questionText: question.trim(),
                status: "pending"
            }
        });

        // 3. Broadcast question created event
        sseService.broadcast('question_created', {
            question: {
                id: savedQuestion.id,
                userId: savedQuestion.userId,
                question: savedQuestion.questionText,
                status: savedQuestion.status,
                createdAt: savedQuestion.createdAt
            }
        });

        // 4. Return immediate response
        res.status(200).json(new ApiResponse(200, "Question submitted successfully", {
            questionId: savedQuestion.id,
            answerId: null // Will be set once processing completes
        }, true));

        // 5. Process question asynchronously
        processQuestionInBackground(savedQuestion.id, question.trim());

    } catch (error) {
        console.error('Error in submitQuestion:', error);
        throw new ApiError(500, "Failed to submit question");
    }
});

/**
 * Ensure user exists, create if not found
 */
async function ensureUserExists(userId: string) {
    let user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) {
        user = await prisma.user.create({
            data: {
                id: userId,
                username: userId // In production, you might want a proper username
            }
        });
        console.log(`Created new user: ${userId}`);
    }

    return user;
}

/**
 * Process question with LLM in background
 */
async function processQuestionInBackground(questionId: string, questionText: string): Promise<void> {
    try {
        console.log(`Processing question ${questionId}: "${questionText}"`);

        // 1. Generate answer using Gemini
        const llmResponse: LLMResponse = await llmService.generateAnswer(questionText);

        // 2. Save answer and visualization to database
        const answer = await saveAnswerWithVisualization(questionId, llmResponse);

        // 3. Update question status
        await prisma.question.update({
            where: { id: questionId },
            data: { status: "answered" }
        });

        // 4. Broadcast answer created event
        sseService.broadcast('answer_created', {
            answer: {
                id: answer.id,
                questionId: answer.questionId,
                text: answer.answerText,
                visualization: answer.visualization,
                createdAt: answer.createdAt
            }
        });

        console.log(`Successfully processed question ${questionId}`);

    } catch (error) {
        console.error(`Error processing question ${questionId}:`, error);
        
        try {
            // Update question status to failed
            await prisma.question.update({
                where: { id: questionId },
                data: { status: "failed" }
            });

            // Broadcast error event
            sseService.broadcast('answer_error', {
                questionId,
                error: 'Failed to generate answer',
                timestamp: new Date().toISOString()
            });

        } catch (dbError) {
            console.error(`Failed to update question status for ${questionId}:`, dbError);
        }
    }
}

/**
 * Save answer and visualization data to database
 */
async function saveAnswerWithVisualization(questionId: string, llmResponse: LLMResponse) {
    const answerData: any = {
        questionId,
        answerText: llmResponse.text
    };

    // Add visualization if provided
    if (llmResponse.visualization) {
        const viz = llmResponse.visualization;
        
        answerData.visualization = {
            create: {
                duration: viz.duration,
                fps: viz.fps,
                metadata: viz.metadata || null,
                layers: {
                    create: viz.layers.map((layer, index) => ({
                        layerId: layer.id,
                        type: layer.type,
                        props: layer.props,
                        orderIndex: index,
                        animations: {
                            create: layer.animations?.map(anim => ({
                                property: anim.property,
                                fromValue: anim.from,
                                toValue: anim.to,
                                startTime: anim.start,
                                endTime: anim.end,
                                easing: anim.easing || 'linear'
                            })) || []
                        }
                    }))
                }
            }
        };
    }

    // Save with all nested relationships
    const answer = await prisma.answer.create({
        data: answerData,
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

    return answer;
}