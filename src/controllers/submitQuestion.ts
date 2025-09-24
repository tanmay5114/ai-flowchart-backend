import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/AsyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { PrismaClient } from "../generated/prisma";
import { llmService, LLMResponse, Frame, VisualizationObject, VisualizationData } from "../services/llm";
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

        console.log("this is the final answer getting broadcasted", answer );
        console.log("this is the frames ", JSON.stringify(answer.visualization?.frames));

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
                visualization: answer.visualization ? {
                    id: answer.visualization.visualizationId || answer.visualization.id,
                    title: answer.visualization.title,
                    description: answer.visualization.description,
                    duration: answer.visualization.duration,
                    fps: answer.visualization.fps,
                    metadata: answer.visualization.metadata,
                    frames: answer.visualization.frames.map(frame => ({
                        timestamp: frame.timestamp,
                        objects: frame.objects.map(obj => ({
                            id: obj.objectId,
                            type: obj.type,
                            properties: obj.properties
                        }))
                    }))
                } : null,
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
        const viz: VisualizationData = llmResponse.visualization;
        
        answerData.visualization = {
            create: {
                visualizationId: viz.id,
                title: viz.title,
                description: viz.description,
                duration: viz.duration,
                fps: viz.fps,
                metadata: viz.metadata || null,
                frames: {
                    create: viz.frames.map((frame: Frame, frameIndex: number) => ({
                        timestamp: frame.timestamp,
                        orderIndex: frameIndex,
                        objects: {
                            create: frame.objects.map((obj: VisualizationObject, objIndex: number) => ({
                                objectId: obj.id,
                                type: obj.type,
                                properties: obj.properties,
                                orderIndex: objIndex
                            }))
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
                    frames: {
                        include: {
                            objects: true
                        },
                        orderBy: {
                            timestamp: 'asc'
                        }
                    }
                }
            }
        }
    });

    return answer;
}