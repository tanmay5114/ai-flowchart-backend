// controllers/sseController.ts
import { Request, Response, RequestHandler } from "express";
import { sseService } from "../services/sse";

/**
 * GET /api/stream - Initialize SSE connection
 */
export const streamEvents: RequestHandler = (req: Request, res: Response) => {
    try {
        // Initialize SSE connection
        const clientId = sseService.initializeConnection(req, res);
        
        // The connection is now handled by the SSE service
        // Response will remain open until client disconnects
        
    } catch (error) {
        console.error('Error initializing SSE connection:', error);
        
        if (!res.headersSent) {
            res.status(500).json({ 
                success: false, 
                message: 'Failed to initialize SSE connection' 
            });
        }
    }
};

/**
 * GET /api/stream/status - Get SSE service status
 */
export const getStreamStatus: RequestHandler = (req: Request, res: Response) => {
    try {
        const status = {
            activeConnections: sseService.getConnectionCount(),
            clients: sseService.getConnectedClients().map(client => ({
                id: client.id,
                userId: client.userId,
                connectedAt: client.connectedAt,
                connectedFor: Date.now() - client.connectedAt.getTime()
            })),
            timestamp: new Date().toISOString()
        };

        res.json({
            success: true,
            data: status
        });

    } catch (error) {
        console.error('Error getting stream status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get stream status'
        });
    }
};

/**
 * POST /api/stream/test - Send test message to all clients
 */
export const sendTestMessage: RequestHandler = (req: Request, res: Response) => {
    try {
        const { message = 'Test message', event = 'test' } = req.body;
        
        sseService.broadcast(event, {
            message,
            timestamp: new Date().toISOString(),
            from: 'server'
        });

        res.json({
            success: true,
            message: `Test message sent to ${sseService.getConnectionCount()} clients`
        });

    } catch (error) {
        console.error('Error sending test message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send test message'
        });
    }
};