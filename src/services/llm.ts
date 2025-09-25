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
2. A Mermaid flowchart using ONLY the safe templates provided below

MANDATORY: Use ONLY these exact templates and substitute the labels:

TEMPLATE 1 - Simple Process (for step-by-step explanations):
flowchart TD
    A[Step 1 Label] --> B[Step 2 Label]
    B --> C[Step 3 Label]
    C --> D[Step 4 Label]
    D --> E[Final Step Label]
    
    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style E fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px

TEMPLATE 2 - Decision Process (for yes/no or choice explanations):
flowchart TD
    A[Starting Point] --> B{Key Question}
    B -->|Option 1| C[Result A]
    B -->|Option 2| D[Result B]
    C --> E[Final Outcome]
    D --> E
    
    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style E fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px

TEMPLATE 3 - Cycle Process (for circular or repeating processes):
flowchart TD
    A[Phase 1] --> B[Phase 2]
    B --> C[Phase 3]
    C --> D[Phase 4]
    D --> A
    
    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:2px

RULES:
- Choose the most appropriate template
- Replace ONLY the labels inside [ ] and { }
- Keep labels simple - no special characters, parentheses, or complex punctuation
- Use only letters, numbers, spaces, and hyphens
- Maximum 3-4 words per label

Response format (JSON only):
{
  "text": "Clear explanation of the concept...",
  "visualization": {
    "id": "unique_id",
    "title": "Chart Title",
    "description": "Brief description of what the chart shows",
    "chartDefinition": "[EXACT TEMPLATE WITH SUBSTITUTED LABELS]",
    "theme": "default"
  }
}

Example good labels:
- "Input Data"
- "Process Information"
- "Make Decision"
- "Generate Output"

Example bad labels (NEVER USE):
- "Process Data (CSV, JSON, etc.)"
- "Check if temp > 25°C"
- "Handle errors & exceptions"

Remember: Use ONLY the provided templates with simple label substitutions.`;
  }

  async generateAnswer(question: string): Promise<LLMResponse> {
    try {
      const prompt = `${this.getSystemPrompt()}

Question: ${question}

Remember: Respond with ONLY the JSON object, no other text. Ensure all Mermaid syntax is clean and parseable.`;

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

      return this.validateAndSanitizeResponse(parsedResponse, question);

    } catch (error) {
      console.error('Gemini API error:', error);
      return this.getFallbackResponse(question);
    }
  }

  private validateAndSanitizeResponse(response: LLMResponse, question: string): LLMResponse {
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
      // REMOVED SANITIZATION - Using template approach instead

      if (!response.visualization.theme) {
        response.visualization.theme = 'default';
      }
    }

    return response;
  }

  private getDefaultChart(): string {
    return `flowchart TD
    A[Question Asked] --> B{Understanding Level}
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
        chartDefinition: this.generateFallbackChart(chartType, question), // REMOVED SANITIZATION
        theme: 'default'
      }
    };
  }

  private generateFallbackChart(type: string, question: string): string {
    const shortQuestion = question.substring(0, 20).replace(/[^\w\s-]/g, ''); // Clean question
    
    if (type === 'sequence') {
      return `flowchart TD
        A[Start Process] --> B[Analyze Question]
        B --> C[Gather Information]
        C --> D[Process Data] 
        D --> E[Generate Insights]
        E --> F[Provide Answer]
        
        style A fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
        style F fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
        style D fill:#fff3e0,stroke:#f57c00,stroke-width:2px`;
    } else if (type === 'state') {
      return `flowchart TD
        A[Question Input] --> B[Processing State]
        B --> C[Analysis State]
        C --> D[Response State]
        D --> E[Complete State]
        
        style A fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
        style E fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px`;
    } else {
      return `flowchart TD
        A[Question Input] --> B{Type of Question}
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