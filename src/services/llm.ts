// services/llm.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface VisualizationLayer {
    id: string;
    type: 'circle' | 'arrow' | 'rectangle' | 'text' | 'line';
    props: Record<string, any>;
    animations?: VisualizationAnimation[];
}

export interface VisualizationAnimation {
    property: string;
    from: any;
    to: any;
    start: number;
    end: number;
    easing?: string;
}

export interface VisualizationSpec {
    id: string;
    duration: number;
    fps: number;
    metadata?: Record<string, any>;
    layers: VisualizationLayer[];
}

export interface LLMResponse {
    text: string;
    visualization?: VisualizationSpec;
}

class LLMService {
    private model;

    constructor() {
        this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    }

    private getSystemPrompt(): string {
        return `You are an educational assistant that explains concepts with both text and interactive visualizations.

IMPORTANT: You must respond with ONLY valid JSON, no additional text or markdown formatting.

For each question, provide:
1. A clear, educational explanation of the concept (3-5 sentences)
2. A visualization specification that demonstrates the concept

Response format (JSON only):
{
  "text": "Clear explanation of the concept...",
  "visualization": {
    "duration": 5000,
    "fps": 30,
    "layers": [
      {
        "id": "unique_layer_id",
        "type": "circle|arrow|rectangle|text|line",
        "props": {
          "x": 100, "y": 200, "r": 20, "fill": "#3498db",
          "width": 100, "height": 50, "text": "Label", "fontSize": 16
        },
        "animations": [
          {
            "property": "x|y|r|opacity|scale",
            "from": startValue,
            "to": endValue,
            "start": 0,
            "end": 3000,
            "easing": "linear|ease-in|ease-out"
          }
        ]
      }
    ]
  }
}

Animation types:
- Movement: property "x" or "y" 
- Scaling: property "scale" (from 1 to 2)
- Fading: property "opacity" (from 0 to 1)
- Rotation: property "rotation" (degrees)
- Orbital: property "orbit" with centerX, centerY, radius

Canvas size: 600x400 pixels. Keep objects within bounds.`;
    }

    async generateAnswer(question: string): Promise<LLMResponse> {
        try {
            const prompt = `${this.getSystemPrompt()}

Question: ${question}

Remember: Respond with ONLY the JSON object, no other text.`;

            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const content = response.text();

            // Clean the response (remove markdown formatting if present)
            const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            let parsedResponse: LLMResponse;
            
            try {
                parsedResponse = JSON.parse(cleanContent);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                console.error('Raw content:', content);
                throw new Error('Invalid JSON response from Gemini');
            }

            // Validate and enhance response
            return this.validateAndEnhanceResponse(parsedResponse, question);

        } catch (error) {
            console.error('Gemini API error:', error);
            return this.getFallbackResponse(question);
        }
    }

    private validateAndEnhanceResponse(response: LLMResponse, question: string): LLMResponse {
        // Ensure text exists
        if (!response.text || typeof response.text !== 'string') {
            response.text = `Here's an explanation of your question about ${question}.`;
        }

        // Ensure visualization has required fields
        if (response.visualization) {
            if (!response.visualization.id) {
                response.visualization.id = `vis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            
            if (!response.visualization.duration) {
                response.visualization.duration = 5000;
            }
            
            if (!response.visualization.fps) {
                response.visualization.fps = 30;
            }

            if (!response.visualization.layers) {
                response.visualization.layers = [];
            }

            // Validate each layer
            response.visualization.layers = response.visualization.layers.map((layer, index) => {
                if (!layer.id) {
                    layer.id = `layer_${index}`;
                }
                if (!layer.type) {
                    layer.type = 'circle';
                }
                if (!layer.props) {
                    layer.props = { x: 100, y: 200, r: 20, fill: '#3498db' };
                }
                if (!layer.animations) {
                    layer.animations = [];
                }
                return layer;
            });
        }

        return response;
    }

    private getFallbackResponse(question: string): LLMResponse {
        return {
            text: `Thank you for asking about "${question}". This is a complex topic that involves multiple interconnected concepts. Let me show you a basic visualization to help explain the fundamental principles.`,
            visualization: {
                id: `vis_fallback_${Date.now()}`,
                duration: 4000,
                fps: 30,
                layers: [
                    {
                        id: 'title_text',
                        type: 'text',
                        props: {
                            x: 300,
                            y: 50,
                            text: 'Concept Visualization',
                            fontSize: 20,
                            fill: '#2c3e50',
                            textAlign: 'center'
                        },
                        animations: [
                            {
                                property: 'opacity',
                                from: 0,
                                to: 1,
                                start: 0,
                                end: 1000,
                                easing: 'ease-in'
                            }
                        ]
                    },
                    {
                        id: 'demo_circle',
                        type: 'circle',
                        props: {
                            x: 150,
                            y: 200,
                            r: 25,
                            fill: '#3498db'
                        },
                        animations: [
                            {
                                property: 'x',
                                from: 150,
                                to: 450,
                                start: 1000,
                                end: 3000,
                                easing: 'linear'
                            }
                        ]
                    },
                    {
                        id: 'info_text',
                        type: 'text',
                        props: {
                            x: 300,
                            y: 300,
                            text: 'Basic animation demonstration',
                            fontSize: 14,
                            fill: '#7f8c8d',
                            textAlign: 'center'
                        },
                        animations: [
                            {
                                property: 'opacity',
                                from: 0,
                                to: 1,
                                start: 2000,
                                end: 3000,
                                easing: 'ease-in'
                            }
                        ]
                    }
                ]
            }
        };
    }

    // Method to test the service with a simple question
    async testService(): Promise<boolean> {
        try {
            const response = await this.generateAnswer("What is gravity?");
            return response.text.length > 0;
        } catch (error) {
            console.error('LLM service test failed:', error);
            return false;
        }
    }
}

// Export singleton instance
export const llmService = new LLMService();

// Export for testing
export { LLMService };