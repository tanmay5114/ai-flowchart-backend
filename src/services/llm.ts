// services/llm.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Extended visualization types to match your canvas component
export type VisualizationType = 'circle' | 'rectangle' | 'rect' | 'text' | 'line' | 'arrow' 
  | 'ellipse' | 'triangle' | 'star' | 'polygon' | 'arc' | 'wave' 
  | 'grid' | 'vector' | 'molecule' | 'beam' | 'particle' | 'orbit' 
  | 'pendulum' | 'spring' | 'path';

export interface VisualizationObject {
  id: string;
  type: VisualizationType;
  properties: VisualizationProperties;
}

export interface VisualizationProperties {
  // Common properties
  x?: number;
  y?: number;
  rotation?: number;
  scale?: number;
  opacity?: number;
  color?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  lineCap?: 'butt' | 'round' | 'square';
  dashPattern?: number[];

  // Shape-specific properties
  // Circle
  r?: number;
  radius?: number;

  // Rectangle
  width?: number;
  height?: number;

  // Text
  text?: string;
  fontSize?: number;
  font?: string;
  textAlign?: 'left' | 'center' | 'right';
  textBaseline?: 'top' | 'middle' | 'bottom';


  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  arrowHeadSize?: number;

  // Ellipse
  radiusX?: number;
  radiusY?: number;
  rx?: number;
  ry?: number;

  // Triangle
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  x3?: number;
  y3?: number;
  points?: Array<{ x: number; y: number }>;

  // Star
  outerRadius?: number;
  innerRadius?: number;
  spikes?: number;

  // Polygon
  sides?: number;
  vertices?: Array<{ x: number; y: number }>;

  // Arc
  startAngle?: number;
  endAngle?: number;
  counterclockwise?: boolean;

  // Wave
  amplitude?: number;
  frequency?: number;
  phase?: number;
  wavelength?: number;

  // Grid
  cellSize?: number;
  cellWidth?: number;
  cellHeight?: number;
  rows?: number;
  cols?: number;

  // Vector
  magnitude?: number;
  direction?: number;

  // Molecule
  atoms?: Array<{ x: number; y: number; element: string; radius?: number }>;
  bonds?: Array<{ from: number; to: number; type?: 'single' | 'double' | 'triple' }>;

  // Beam/Particle
  intensity?: number;
  energy?: number;
  velocity?: { x: number; y: number };

  // Orbit
  centerX?: number;
  centerY?: number;
  orbitalRadius?: number;
  speed?: number;

  // Pendulum
  length?: number;
  angle?: number;
  angularVelocity?: number;

  // Spring
  coils?: number;
  compression?: number;
  springConstant?: number;

  // Path
  path?: Array<{ x: number; y: number }>;
  pathString?: string;
}

export interface Frame {
  timestamp: number;
  objects: VisualizationObject[];
}

export interface VisualizationData {
  id: string;
  title: string;
  description: string;
  duration: number;
  fps: number;
  metadata?: Record<string, any>;
  frames: Frame[];
}

export interface LLMResponse {
  text: string;
  visualization?: VisualizationData;
}

class LLMService {
  private model;

  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  private getSystemPrompt(): string {
    return `You are an educational assistant that explains concepts with both text and interactive visualizations.

IMPORTANT: You must respond with ONLY valid JSON, no additional text or markdown formatting.

Available visualization types:
- Basic shapes: circle, rectangle, ellipse, triangle, star, polygon, arc
- Interactive: arrow, line, vector, path
- Scientific: wave, molecule, beam, particle, orbit, pendulum, spring
- Utility: text, grid

For each question, provide:
1. A clear, educational explanation of the concept (3-5 sentences)
2. A frame-based visualization that demonstrates the concept with smooth animations

Response format (JSON only):
{
  "text": "Clear explanation of the concept...",
  "visualization": {
    "id": "unique_id",
    "title": "Visualization Title",
    "description": "Brief description",
    "duration": 5000,
    "fps": 30,
    "frames": [
      {
        "timestamp": 0,
        "objects": [
          {
            "id": "unique_object_id",
            "type": 'circle' | 'rectangle' | 'rect' | 'text' | 'line' | 'arrow' 
  | 'ellipse' | 'triangle' | 'star' | 'polygon' | 'arc' | 'wave' 
  | 'grid' | 'vector' | 'molecule' | 'beam' | 'particle' | 'orbit' 
  | 'pendulum' | 'spring' | 'path';,
            "properties": {
              "x": 100, "y": 200, "r": 20, "fill": "#3498db",
              "opacity": 1.0, "scale": 1.0, "rotation": 0
            }
          }
        ]
      },
      {
        "timestamp": 1000,
        "objects": [
          {
            "id": "same_object_id",
            "type": "circle",
            "properties": {
              "x": 200, "y": 200, "r": 30, "fill": "#e74c3c",
              "opacity": 0.8, "scale": 1.2, "rotation": 45
            }
          }
        ]
      }
    ]
  }
}

Animation guidelines:
- Create smooth transitions between frames (every 100-500ms for smooth animation)
- Use consistent object IDs across frames for smooth interpolation
- Canvas size: 800x600 pixels - keep objects within bounds
- Use meaningful colors and sizes for educational clarity
- For physics concepts: use realistic proportions and movements
- For chemistry: use standard colors (H=white, O=red, C=black, etc.)
- For waves: use amplitude, frequency, and phase properties
- For molecular visualization: define atoms and bonds arrays

Property examples by type:
- circle: {x, y, r, fill, stroke, opacity}
- rectangle: {x, y, width, height, fill, stroke}
- text: {x, y, text, fontSize, fill, textAlign}
- wave: {x, y, amplitude, frequency, phase, length, stroke}
- molecule: {x, y, atoms: [{x, y, element, radius}], bonds: [{from, to, type}]}
- orbit: {centerX, centerY, orbitalRadius, x, y, fill}
- pendulum: {x, y, length, angle, fill}
- vector: {x, y, magnitude, angle, stroke, arrowHeadSize}

Remember: Create educational, visually appealing animations that help explain the concept clearly.`;
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
      
      if (!response.visualization.title) {
        response.visualization.title = 'Concept Visualization';
      }

      if (!response.visualization.description) {
        response.visualization.description = 'Interactive visualization explaining the concept';
      }
      
      if (!response.visualization.duration) {
        response.visualization.duration = 5000;
      }
      
      if (!response.visualization.fps) {
        response.visualization.fps = 30;
      }

      if (!response.visualization.frames || response.visualization.frames.length === 0) {
        response.visualization.frames = this.generateDefaultFrames();
      }

      // Validate each frame
      response.visualization.frames = response.visualization.frames.map((frame, index) => {
        if (frame.timestamp === undefined) {
          frame.timestamp = index * 1000; // Default to 1 second intervals
        }
        
        if (!frame.objects) {
          frame.objects = [];
        }

        // Validate each object in the frame
        frame.objects = frame.objects.map((obj, objIndex) => {
          if (!obj.id) {
            obj.id = `obj_${objIndex}`;
          }
          if (!obj.type) {
            obj.type = 'circle';
          }
          if (!obj.properties) {
            obj.properties = { x: 100, y: 200, r: 20, fill: '#3498db' };
          }
          
          // Ensure essential properties based on type
          obj.properties = this.validateObjectProperties(obj.type, obj.properties);
          
          return obj;
        });

        return frame;
      });

      // Sort frames by timestamp
      response.visualization.frames.sort((a, b) => a.timestamp - b.timestamp);
    }

    return response;
  }

  private validateObjectProperties(type: VisualizationType, props: VisualizationProperties): VisualizationProperties {
    // Set defaults based on object type
    switch (type) {
      case 'circle':
        return {
          x: 100, y: 200, r: 20, fill: '#3498db', opacity: 1,
          ...props
        };
      
      case 'rectangle':
      case 'rect':
        return {
          x: 100, y: 200, width: 100, height: 60, fill: '#3498db', opacity: 1,
          ...props
        };
      
      case 'text':
        return {
          x: 100, y: 200, text: 'Text', fontSize: 16, fill: '#2c3e50', opacity: 1,
          ...props
        };
      
      case 'line':
        return {
          x1: 50, y1: 200, x2: 150, y2: 200, stroke: '#2c3e50', strokeWidth: 2, opacity: 1,
          ...props
        };
      
      case 'arrow':
        return {
          x1: 50, y1: 200, x2: 150, y2: 200, stroke: '#2c3e50', strokeWidth: 2, 
          arrowHeadSize: 10, opacity: 1,
          ...props
        };
      
      case 'wave':
        return {
          x: 50, y: 200, amplitude: 30, frequency: 1, phase: 0, length: 200, 
          stroke: '#3498db', strokeWidth: 2, opacity: 1,
          ...props
        };
      
      case 'molecule':
        return {
          x: 100, y: 200, 
          atoms: props.atoms || [
            { x: 0, y: 0, element: 'C', radius: 15 },
            { x: 30, y: 0, element: 'H', radius: 10 }
          ],
          bonds: props.bonds || [{ from: 0, to: 1, type: 'single' }],
          opacity: 1,
          ...props
        };
      
      case 'orbit':
        return {
          centerX: 200, centerY: 200, orbitalRadius: 80, x: 280, y: 200, 
          r: 10, fill: '#3498db', opacity: 1,
          ...props
        };
      
      case 'pendulum':
        return {
          x: 200, y: 100, length: 100, angle: 0, r: 15, fill: '#e74c3c', 
          stroke: '#2c3e50', strokeWidth: 2, opacity: 1,
          ...props
        };
      
      default:
        return {
          x: 100, y: 200, fill: '#3498db', opacity: 1,
          ...props
        };
    }
  }

  private generateDefaultFrames(): Frame[] {
    return [
      {
        timestamp: 0,
        objects: [
          {
            id: 'title_text',
            type: 'text',
            properties: {
              x: 400,
              y: 80,
              text: 'Concept Visualization',
              fontSize: 24,
              fill: '#2c3e50',
              textAlign: 'center',
              opacity: 1
            }
          },
          {
            id: 'demo_circle',
            type: 'circle',
            properties: {
              x: 200,
              y: 300,
              r: 25,
              fill: '#3498db',
              opacity: 1
            }
          }
        ]
      },
      {
        timestamp: 2000,
        objects: [
          {
            id: 'title_text',
            type: 'text',
            properties: {
              x: 400,
              y: 80,
              text: 'Concept Visualization',
              fontSize: 24,
              fill: '#2c3e50',
              textAlign: 'center',
              opacity: 1
            }
          },
          {
            id: 'demo_circle',
            type: 'circle',
            properties: {
              x: 600,
              y: 300,
              r: 35,
              fill: '#e74c3c',
              opacity: 0.8
            }
          }
        ]
      }
    ];
  }

  private getFallbackResponse(question: string): LLMResponse {
    return {
      text: `Thank you for asking about "${question}". This is a complex topic that involves multiple interconnected concepts. Let me show you a basic visualization to help explain the fundamental principles.`,
      visualization: {
        id: `vis_fallback_${Date.now()}`,
        title: 'Basic Concept Demonstration',
        description: 'A simple animation showing fundamental principles',
        duration: 4000,
        fps: 30,
        frames: [
          {
            timestamp: 0,
            objects: [
              {
                id: 'title_text',
                type: 'text',
                properties: {
                  x: 400,
                  y: 100,
                  text: 'Exploring: ' + question.substring(0, 30) + '...',
                  fontSize: 20,
                  fill: '#2c3e50',
                  textAlign: 'center',
                  opacity: 0
                }
              },
              {
                id: 'demo_circle',
                type: 'circle',
                properties: {
                  x: 150,
                  y: 300,
                  r: 25,
                  fill: '#3498db',
                  opacity: 0
                }
              }
            ]
          },
          {
            timestamp: 500,
            objects: [
              {
                id: 'title_text',
                type: 'text',
                properties: {
                  x: 400,
                  y: 100,
                  text: 'Exploring: ' + question.substring(0, 30) + '...',
                  fontSize: 20,
                  fill: '#2c3e50',
                  textAlign: 'center',
                  opacity: 1
                }
              },
              {
                id: 'demo_circle',
                type: 'circle',
                properties: {
                  x: 150,
                  y: 300,
                  r: 25,
                  fill: '#3498db',
                  opacity: 1
                }
              }
            ]
          },
          {
            timestamp: 2000,
            objects: [
              {
                id: 'title_text',
                type: 'text',
                properties: {
                  x: 400,
                  y: 100,
                  text: 'Exploring: ' + question.substring(0, 30) + '...',
                  fontSize: 20,
                  fill: '#2c3e50',
                  textAlign: 'center',
                  opacity: 1
                }
              },
              {
                id: 'demo_circle',
                type: 'circle',
                properties: {
                  x: 650,
                  y: 300,
                  r: 40,
                  fill: '#e74c3c',
                  opacity: 1
                }
              }
            ]
          },
          {
            timestamp: 3500,
            objects: [
              {
                id: 'title_text',
                type: 'text',
                properties: {
                  x: 400,
                  y: 100,
                  text: 'Exploring: ' + question.substring(0, 30) + '...',
                  fontSize: 20,
                  fill: '#2c3e50',
                  textAlign: 'center',
                  opacity: 1
                }
              },
              {
                id: 'demo_circle',
                type: 'circle',
                properties: {
                  x: 400,
                  y: 450,
                  r: 30,
                  fill: '#27ae60',
                  opacity: 1
                }
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
      return response.text.length > 0 && response.visualization !== undefined;
    } catch (error) {
      console.error('LLM service test failed:', error);
      return false;
    }
  }

  // Helper method to create a physics animation template
  createPhysicsTemplate(concept: string): VisualizationData {
    return {
      id: `physics_${Date.now()}`,
      title: `Physics: ${concept}`,
      description: `Interactive demonstration of ${concept}`,
      duration: 6000,
      fps: 30,
      frames: [
        {
          timestamp: 0,
          objects: [
            {
              id: 'physics_ball',
              type: 'circle',
              properties: {
                x: 100,
                y: 100,
                r: 20,
                fill: '#3498db',
                opacity: 1
              }
            }
          ]
        }
      ]
    };
  }

  // Helper method to create a chemistry animation template  
  createChemistryTemplate(concept: string): VisualizationData {
    return {
      id: `chemistry_${Date.now()}`,
      title: `Chemistry: ${concept}`,
      description: `Molecular visualization of ${concept}`,
      duration: 5000,
      fps: 30,
      frames: [
        {
          timestamp: 0,
          objects: [
            {
              id: 'water_molecule',
              type: 'molecule',
              properties: {
                x: 400,
                y: 300,
                atoms: [
                  { x: 0, y: 0, element: 'O', radius: 16 },
                  { x: -25, y: 20, element: 'H', radius: 8 },
                  { x: 25, y: 20, element: 'H', radius: 8 }
                ],
                bonds: [
                  { from: 0, to: 1, type: 'single' },
                  { from: 0, to: 2, type: 'single' }
                ],
                opacity: 1
              }
            }
          ]
        }
      ]
    };
  }
}

// Export singleton instance
export const llmService = new LLMService();

// Export for testing
export { LLMService };