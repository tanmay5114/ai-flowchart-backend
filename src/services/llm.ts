// services/llm.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface MermaidVisualization {
  id: string;
  title: string;
  description: string;
  chartDefinition: string;
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
}

export interface LLMResponse {
  text: string;
  visualization?: MermaidVisualization;
}

class LLMService {
  private model;

  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  private getSystemPrompt(): string {
    return `You are an educational assistant that explains concepts with both text and Mermaid flowchart visualizations.

IMPORTANT: You must respond with ONLY valid JSON, no additional text or markdown formatting.

For each question, provide:
1. A clear, educational explanation of the concept (3-5 sentences)
2. A Mermaid flowchart that visualizes the concept, process, or relationship

Available Mermaid chart types:
- flowchart TD (top down)
- flowchart LR (left to right) 
- flowchart TB (top bottom)
- sequenceDiagram
- stateDiagram-v2
- erDiagram
- graph TD/LR

Response format (JSON only):
{
  "text": "Clear explanation of the concept...",
  "visualization": {
    "id": "unique_id",
    "title": "Chart Title",
    "description": "Brief description of what the chart shows",
    "chartDefinition": "flowchart TD\\n    A[Start] --> B{Decision?}\\n    B -->|Yes| C[Action]\\n    B -->|No| D[Alternative]\\n    C --> E[End]\\n    D --> E\\n    \\n    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:2px\\n    style E fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px",
    "theme": "default"
  }
}

Chart guidelines:
- Use meaningful node labels that explain the concept
- Add styling with fill colors and stroke properties
- For processes: use flowchart TD or LR
- For sequences: use sequenceDiagram
- For state changes: use stateDiagram-v2
- For data relationships: use erDiagram
- Keep charts educational and clear
- Use decision nodes {} for branching logic
- Use action nodes [] for processes
- Use different colors to highlight key concepts

Color suggestions:
- Blue (#e3f2fd, #1976d2): Start/Input
- Purple (#f3e5f5, #7b1fa2): End/Output  
- Orange (#fff3e0, #f57c00): Important processes
- Green (#e8f5e8, #388e3c): Success/Results
- Red (#ffebee, #c62828): Errors/Warnings

Remember: Create educational, clear flowcharts that help explain the concept visually.`;
  }

  async generateAnswer(question: string): Promise<LLMResponse> {
    try {
      const prompt = `${this.getSystemPrompt()}

Question: ${question}

Remember: Respond with ONLY the JSON object, no other text.`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const content = response.text();

      // Clean the response
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      let parsedResponse: LLMResponse;
      
      try {
        parsedResponse = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw content:', content);
        throw new Error('Invalid JSON response from Gemini');
      }

      return this.validateResponse(parsedResponse, question);

    } catch (error) {
      console.error('Gemini API error:', error);
      return this.getFallbackResponse(question);
    }
  }

  private validateResponse(response: LLMResponse, question: string): LLMResponse {
    // Ensure text exists
    if (!response.text || typeof response.text !== 'string') {
      response.text = `Here's an explanation of your question about ${question}.`;
    }

    // Ensure visualization has required fields
    if (response.visualization) {
      if (!response.visualization.id) {
        response.visualization.id = `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      if (!response.visualization.title) {
        response.visualization.title = 'Concept Flowchart';
      }

      if (!response.visualization.description) {
        response.visualization.description = 'Visual representation of the concept';
      }
      
      if (!response.visualization.chartDefinition) {
        response.visualization.chartDefinition = this.getDefaultChart();
      }

      if (!response.visualization.theme) {
        response.visualization.theme = 'default';
      }
    }

    return response;
  }

  private getDefaultChart(): string {
    return `flowchart TD
    A[Question Asked] --> B{Understanding Level?}
    B -->|Basic| C[Simple Explanation]
    B -->|Advanced| D[Detailed Analysis]
    C --> E[Provide Examples]
    D --> F[Technical Details]
    E --> G[Visual Representation]
    F --> G
    G --> H[Complete Answer]
    
    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style H fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style G fill:#e8f5e8,stroke:#388e3c,stroke-width:2px`;
  }

  private getFallbackResponse(question: string): LLMResponse {
    const topicKeywords = question.toLowerCase();
    let chartType = 'process';
    
    if (topicKeywords.includes('sequence') || topicKeywords.includes('step') || topicKeywords.includes('order')) {
      chartType = 'sequence';
    } else if (topicKeywords.includes('state') || topicKeywords.includes('change') || topicKeywords.includes('transition')) {
      chartType = 'state';
    }

    const fallbackChart = this.generateFallbackChart(chartType, question);

    return {
      text: `Thank you for asking about "${question}". This is a complex topic with multiple interconnected concepts. The flowchart below shows the key relationships and processes involved in understanding this concept.`,
      visualization: {
        id: `fallback_${Date.now()}`,
        title: `Understanding: ${question.substring(0, 40)}...`,
        description: 'A flowchart breaking down the key concepts and relationships',
        chartDefinition: fallbackChart,
        theme: 'default'
      }
    };
  }

  private generateFallbackChart(type: string, question: string): string {
    const shortQuestion = question.substring(0, 20) + '...';
    
    if (type === 'sequence') {
      return `flowchart LR
        A[Start: ${shortQuestion}] --> B[Analyze Question]
        B --> C[Gather Information]
        C --> D[Process Data] 
        D --> E[Generate Insights]
        E --> F[Provide Answer]
        
        style A fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
        style F fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
        style D fill:#fff3e0,stroke:#f57c00,stroke-width:2px`;
    } else if (type === 'state') {
      return `stateDiagram-v2
        [*] --> Question
        Question --> Analysis
        Analysis --> Understanding
        Understanding --> Response
        Response --> [*]
        
        Question: ${shortQuestion}
        Analysis: Processing Information
        Understanding: Concept Clarity
        Response: Final Answer`;
    } else {
      return `flowchart TD
        A[${shortQuestion}] --> B{Type of Question?}
        B -->|Factual| C[Research Facts]
        B -->|Conceptual| D[Explain Concept]
        B -->|Process| E[Show Steps]
        C --> F[Verify Information]
        D --> G[Use Examples]
        E --> H[Create Flowchart]
        F --> I[Provide Answer]
        G --> I
        H --> I
        
        style A fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
        style I fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
        style G fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
        style H fill:#fff3e0,stroke:#f57c00,stroke-width:2px`;
    }
  }

  async testService(): Promise<boolean> {
    try {
      const response = await this.generateAnswer("What is photosynthesis?");
      return response.text.length > 0 && response.visualization !== undefined;
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