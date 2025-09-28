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
  private modelsList = [
    'gemini-1.5-flash',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite'
  ]

  constructor() {
    this.model = genAI.getGenerativeModel({ model: this.modelsList[Math.floor(Math.random() * 6)] });
  }

  private getSystemPrompt(): string {
    return `You are an educational assistant that explains concepts with both text and Mermaid flowchart visualizations.

IMPORTANT: You must respond with ONLY valid JSON, no additional text or markdown formatting.

For each question, provide:
1. A clear, educational explanation of the concept (3-5 sentences)
2. A Mermaid flowchart using ONLY the safe templates provided below

MANDATORY: Use ONLY these exact templates and substitute the labels. Choose the template that best fits the concept:

TEMPLATE 1 - Linear Process (for step-by-step explanations):
flowchart TD
    A[Step 1] --> B[Step 2]
    B --> C[Step 3]
    C --> D[Step 4]
    D --> E[Step 5]
    E --> F[Final Result]
    
    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style F fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style C fill:#fff3e0,stroke:#f57c00,stroke-width:2px

TEMPLATE 2 - Decision Tree (for choice-based explanations):
flowchart TD
    A[Starting Point] --> B{Primary Decision}
    B -->|Option A| C[Path A Result]
    B -->|Option B| D{Secondary Decision}
    D -->|Choice 1| E[Outcome 1]
    D -->|Choice 2| F[Outcome 2]
    C --> G[Final State]
    E --> G
    F --> G
    
    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style G fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style B fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style D fill:#fff3e0,stroke:#f57c00,stroke-width:2px

TEMPLATE 3 - Parallel Processing (for multiple simultaneous processes):
flowchart TD
    A[Input Source] --> B[Process Split]
    B --> C[Branch 1]
    B --> D[Branch 2] 
    B --> E[Branch 3]
    C --> F[Result 1]
    D --> G[Result 2]
    E --> H[Result 3]
    F --> I[Combine Results]
    G --> I
    H --> I
    I --> J[Final Output]
    
    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style J fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style I fill:#e8f5e8,stroke:#388e3c,stroke-width:2px

TEMPLATE 4 - Circular/Feedback Process (for cycles and loops):
flowchart TD
    A[Initialize] --> B[Action 1]
    B --> C[Action 2]
    C --> D[Action 3]
    D --> E{Check Condition}
    E -->|Continue| F[Process More]
    E -->|Complete| G[Final State]
    F --> B
    G --> H[End Process]
    
    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style H fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style E fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style G fill:#e8f5e8,stroke:#388e3c,stroke-width:2px

TEMPLATE 5 - Hierarchical Structure (for classification or breakdown):
flowchart TD
    A[Main Concept] --> B[Category 1]
    A --> C[Category 2]
    A --> D[Category 3]
    B --> E[Sub Item 1A]
    B --> F[Sub Item 1B]
    C --> G[Sub Item 2A]
    C --> H[Sub Item 2B]
    D --> I[Sub Item 3A]
    D --> J[Sub Item 3B]
    
    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style B fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style C fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style D fill:#fff3e0,stroke:#f57c00,stroke-width:2px

TEMPLATE 6 - Input-Process-Output with Feedback (for system analysis):
flowchart TD
    A[Input Data] --> B[Validation]
    B --> C{Valid Input}
    C -->|Yes| D[Main Processing]
    C -->|No| E[Error Handling]
    E --> F[Correction Process]
    F --> B
    D --> G[Generate Output]
    G --> H[Quality Check]
    H --> I{Quality OK}
    I -->|Yes| J[Deliver Result]
    I -->|No| K[Refinement]
    K --> D
    J --> L[Success State]
    
    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style L fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style E fill:#ffebee,stroke:#c62828,stroke-width:2px
    style J fill:#e8f5e8,stroke:#388e3c,stroke-width:2px

TEMPLATE 7 - Comparison Analysis (for comparing options):
flowchart TD
    A[Problem Statement] --> B[Gather Options]
    B --> C[Option 1]
    B --> D[Option 2]
    B --> E[Option 3]
    C --> F[Evaluate Pros 1]
    C --> G[Evaluate Cons 1]
    D --> H[Evaluate Pros 2]
    D --> I[Evaluate Cons 2]
    E --> J[Evaluate Pros 3]
    E --> K[Evaluate Cons 3]
    F --> L[Comparison Matrix]
    G --> L
    H --> L
    I --> L
    J --> L
    K --> L
    L --> M[Best Choice]
    
    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style M fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style L fill:#e8f5e8,stroke:#388e3c,stroke-width:2px

TEMPLATE 8 - State Machine (for status changes):
flowchart TD
    A[Initial State] --> B{Trigger Event}
    B -->|Event A| C[State 1]
    B -->|Event B| D[State 2]
    B -->|Event C| E[State 3]
    C --> F{Next Trigger}
    D --> G{Next Trigger}
    E --> H{Next Trigger}
    F -->|Transform| I[Advanced State]
    G -->|Transform| I
    H -->|Transform| I
    F -->|Reset| A
    G -->|Reset| A
    H -->|Reset| A
    I --> J[Final State]
    
    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style J fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style I fill:#e8f5e8,stroke:#388e3c,stroke-width:2px

RULES:
- Choose the template that best represents the concept structure
- Replace ONLY the labels inside [ ] and { }
- Keep labels simple - no special characters, parentheses, or complex punctuation
- Use only letters, numbers, spaces, and hyphens
- Maximum 4-5 words per label
- Be creative with label choices while keeping syntax simple

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

Template Selection Guide:
- Use TEMPLATE 1 for: Recipes, procedures, assembly instructions
- Use TEMPLATE 2 for: Decision making, troubleshooting, classification
- Use TEMPLATE 3 for: Manufacturing, data processing, parallel tasks
- Use TEMPLATE 4 for: Learning cycles, improvement processes, iterations
- Use TEMPLATE 5 for: Taxonomies, organizational charts, breakdowns
- Use TEMPLATE 6 for: Systems analysis, quality control, validation
- Use TEMPLATE 7 for: Comparisons, evaluations, choosing between options
- Use TEMPLATE 8 for: Life cycles, status tracking, workflow states

Example good labels:
- "Gather Raw Materials"
- "Heat to 350 Degrees"
- "Check Quality Standards"
- "Generate Final Report"
- "User Authentication"
- "Data Validation Phase"

Example bad labels (NEVER USE):
- "Heat to 350°F (or 175°C)"
- "Check if temp > threshold"
- "Generate report (PDF/Excel)"

Remember: Use creative, descriptive labels but keep the syntax structure exactly as provided in templates.`;
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