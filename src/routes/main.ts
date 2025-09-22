import { Router } from "express";
import { submitQuestion } from "../controllers/submitQuestion";
import { getStreamStatus, sendTestMessage, streamEvents } from "../controllers/sseController";
import { getAllQuestions, getQuestionById } from "../controllers/getAllQuestions";
import { getAnswerById, getAllAnswers, getVisualizationById } from "../controllers/getAnswersById";
import { getUserById, getAllUsers, createAUser } from "../controllers/user";

const app: Router = Router();

// Question Routes
app.post('/api/questions', submitQuestion);           // Submit new question
app.get('/api/questions', getAllQuestions);          // Get all questions with pagination/filters
app.get('/api/questions/:id', getQuestionById);      // Get specific question with answer

// Answer Routes  
app.get('/api/answers/:id', getAnswerById);          // Get answer with full visualization
app.get('/api/answers', getAllAnswers);              // Get all answers with pagination/filters
app.get('/api/answers/:id/visualization', getVisualizationById); // Get only visualization data

// User Routes
app.get('/api/users/:id', getUserById);              // Get user profile with stats
app.get('/api/users', getAllUsers);                  // Get all users (admin)
app.post('/api/user', createAUser);

// SSE Routes
app.get('/api/stream', streamEvents);                // Initialize SSE connection
app.get('/api/stream/status', getStreamStatus);      // Get SSE status
app.post('/api/stream/test', sendTestMessage);  

export default app;

//cmfv6tjeg0000utxoryyox8ao