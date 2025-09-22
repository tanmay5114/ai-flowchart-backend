// services/sse.ts
import { Request, Response } from 'express';

export interface SSEClient {
    id: string;
    response: Response;
    userId?: string;
    connectedAt: Date;
}

export interface SSEMessage {
    event: string;
    data: any;
    id?: string;
    retry?: number;
}

class SSEService {
    private clients: Map<string, SSEClient> = new Map();
    private messageHistory: SSEMessage[] = [];
    private maxHistorySize: number = 100;

    /**
     * Initialize SSE connection for a client
     */
    initializeConnection(req: Request, res: Response): string {
        const clientId = this.generateClientId();
        const userId = req.query.userId as string;

        // Set SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control, Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        });

        // Send initial connection message
        this.sendToClient(res, {
            event: 'connected',
            data: { 
                clientId, 
                message: 'SSE connection established',
                timestamp: new Date().toISOString()
            },
            id: `connect_${clientId}`
        });

        // Store client
        const client: SSEClient = {
            id: clientId,
            response: res,
            userId,
            connectedAt: new Date()
        };

        this.clients.set(clientId, client);

        // Setup cleanup on disconnect
        this.setupClientCleanup(clientId, res);

        // Send recent messages to new client (last 10 messages)
        this.sendRecentMessages(res, 10);

        console.log(`SSE client ${clientId} connected${userId ? ` (user: ${userId})` : ''}`);
        
        return clientId;
    }

    /**
     * Broadcast message to all connected clients
     */
    broadcast(event: string, data: any, options?: { 
        excludeClient?: string, 
        userId?: string,
        persistent?: boolean 
    }): void {
        const message: SSEMessage = {
            event,
            data,
            id: `${event}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        };

        // Add to history if persistent
        if (options?.persistent !== false) {
            this.addToHistory(message);
        }

        let sentCount = 0;

        this.clients.forEach((client) => {
            // Skip excluded client
            if (options?.excludeClient && client.id === options.excludeClient) {
                return;
            }

            // Filter by userId if specified
            if (options?.userId && client.userId !== options.userId) {
                return;
            }

            try {
                this.sendToClient(client.response, message);
                sentCount++;
            } catch (error) {
                console.error(`Error sending to client ${client.id}:`, error);
                this.removeClient(client.id);
            }
        });

        console.log(`Broadcasted ${event} to ${sentCount}/${this.clients.size} clients`);
    }

    /**
     * Send message to specific client
     */
    sendToClient(res: Response, message: SSEMessage): void {
        const { event, data, id, retry } = message;
        
        let sseMessage = '';
        
        if (id) {
            sseMessage += `id: ${id}\n`;
        }
        
        if (retry) {
            sseMessage += `retry: ${retry}\n`;
        }
        
        sseMessage += `event: ${event}\n`;
        sseMessage += `data: ${JSON.stringify(data)}\n\n`;

        res.write(sseMessage);
    }

    /**
     * Send message to specific client by ID
     */
    sendToClientById(clientId: string, event: string, data: any): boolean {
        const client = this.clients.get(clientId);
        
        if (!client) {
            console.warn(`Client ${clientId} not found`);
            return false;
        }

        try {
            this.sendToClient(client.response, { event, data });
            return true;
        } catch (error) {
            console.error(`Error sending to client ${clientId}:`, error);
            this.removeClient(clientId);
            return false;
        }
    }

    /**
     * Remove client connection
     */
    removeClient(clientId: string): void {
        const client = this.clients.get(clientId);
        
        if (client) {
            try {
                client.response.end();
            } catch (error) {
                // Client might already be disconnected
            }
            
            this.clients.delete(clientId);
            console.log(`SSE client ${clientId} disconnected`);
        }
    }

    /**
     * Get all connected clients info
     */
    getConnectedClients(): Array<{ id: string; userId?: string; connectedAt: Date }> {
        return Array.from(this.clients.values()).map(client => ({
            id: client.id,
            userId: client.userId,
            connectedAt: client.connectedAt
        }));
    }

    /**
     * Get number of active connections
     */
    getConnectionCount(): number {
        return this.clients.size;
    }

    /**
     * Send ping to all clients to keep connection alive
     */
    sendHeartbeat(): void {
        this.broadcast('ping', { 
            timestamp: new Date().toISOString(),
            activeConnections: this.clients.size 
        }, { persistent: false });
    }

    /**
     * Start heartbeat interval
     */
    startHeartbeat(intervalMs: number = 30000): NodeJS.Timeout {
        return setInterval(() => {
            this.sendHeartbeat();
        }, intervalMs);
    }

    /**
     * Clear all connections and history
     */
    clearAll(): void {
        this.clients.forEach((client) => {
            try {
                client.response.end();
            } catch (error) {
                // Ignore errors on cleanup
            }
        });
        
        this.clients.clear();
        this.messageHistory = [];
        console.log('All SSE connections cleared');
    }

    private generateClientId(): string {
        return `sse_${Date.now()}_${Math.random().toString(36).substr(2, 10)}`;
    }

    private setupClientCleanup(clientId: string, res: Response): void {
        const cleanup = () => {
            this.removeClient(clientId);
        };

        res.on('close', cleanup);
        res.on('error', cleanup);
        res.on('finish', cleanup);

        // Timeout cleanup (optional - remove clients after 1 hour of inactivity)
        setTimeout(() => {
            if (this.clients.has(clientId)) {
                console.log(`Cleaning up inactive client: ${clientId}`);
                this.removeClient(clientId);
            }
        }, 60 * 60 * 1000); // 1 hour
    }

    private addToHistory(message: SSEMessage): void {
        this.messageHistory.push(message);
        
        // Keep only recent messages
        if (this.messageHistory.length > this.maxHistorySize) {
            this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
        }
    }

    private sendRecentMessages(res: Response, count: number): void {
        const recentMessages = this.messageHistory.slice(-count);
        
        recentMessages.forEach(message => {
            try {
                this.sendToClient(res, message);
            } catch (error) {
                console.error('Error sending recent message:', error);
            }
        });
    }
}

// Export singleton instance
export const sseService = new SSEService();

// Export for testing
export { SSEService };