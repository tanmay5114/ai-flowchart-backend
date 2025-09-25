import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/AsyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { PrismaClient } from "../generated/prisma";
import { llmService, LLMResponse, MermaidVisualization } from "../services/llm";
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

        // 2. Save answer and chart to database
        const answer = await saveAnswerWithChart(questionId, llmResponse);

        console.log("Broadcasting answer with chart:", answer.id);

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
                chart: answer.chart ? {
                    id: answer.chart.chartId || answer.chart.id,
                    title: answer.chart.title,
                    description: answer.chart.description,
                    chartDefinition: answer.chart.chartDefinition,
                    theme: answer.chart.theme
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
 * Save answer and chart data to database
 */
async function saveAnswerWithChart(questionId: string, llmResponse: LLMResponse) {
    const answerData: any = {
        questionId,
        answerText: llmResponse.text
    };

    // Add chart if provided
    if (llmResponse.visualization) {
        const chart: MermaidVisualization = llmResponse.visualization;
        
        answerData.chart = {
            create: {
                chartId: chart.id,
                title: chart.title,
                description: chart.description,
                chartDefinition: chart.chartDefinition,
                theme: chart.theme || 'default'
            }
        };
    }

    // Save with chart relationship
    const answer = await prisma.answer.create({
        data: answerData,
        include: {
            chart: true
        }
    });

    return answer;
}
/**
 * Get conversation history
 */
export const getQuestionHistory: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    try {
        const questions = await prisma.question.findMany({
            include: {
                answer: { // Changed from 'answers' to 'answer' (one-to-one relationship)
                    include: {
                        chart: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 50 // Limit to recent 50 questions
        });

        const formattedQuestions = questions.map(q => ({
            id: q.id,
            content: q.questionText,
            timestamp: q.createdAt,
            status: q.status,
            answer: q.answer ? { // Changed from 'answers' array to single 'answer'
                id: q.answer.id,
                questionId: q.answer.questionId,
                content: q.answer.answerText,
                timestamp: q.answer.createdAt,
                chart: q.answer.chart ? {
                    id: q.answer.chart.chartId,
                    title: q.answer.chart.title,
                    description: q.answer.chart.description,
                    chartDefinition: q.answer.chart.chartDefinition,
                    theme: q.answer.chart.theme
                } : null
            } : null
        }));

        res.status(200).json(new ApiResponse(200, "Question history retrieved", {
            questions: formattedQuestions
        }, true));

    } catch (error) {
        console.error('Error getting question history:', error);
        throw new ApiError(500, "Failed to retrieve question history");
    }
});
/**
 * Get specific chart by ID
 */
export const getChart: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { chartId } = req.params;

    if (!chartId) {
        throw new ApiError(400, "Chart ID is required");
    }

    try {
        const chart = await prisma.chart.findUnique({
            where: { chartId }
        });

        if (!chart) {
            throw new ApiError(404, "Chart not found");
        }

        res.status(200).json(new ApiResponse(200, "Chart retrieved", {
            chart: {
                id: chart.chartId,
                title: chart.title,
                description: chart.description,
                chartDefinition: chart.chartDefinition,
                theme: chart.theme,
                createdAt: chart.createdAt
            }
        }, true));

    } catch (error) {
        console.error('Error getting chart:', error);
        throw new ApiError(500, "Failed to retrieve chart");
    }
});