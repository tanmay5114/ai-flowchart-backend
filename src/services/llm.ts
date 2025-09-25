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

// Enhanced sanitization function with better error handling
const sanitizeChartDefinition = (definition: string): string => {
  console.log('🧹 Sanitizing definition (length):', definition.length);
  console.log('🧹 Raw definition:', JSON.stringify(definition));
  
  // Check if definition seems truncated
  if (definition.includes('{') && !definition.includes('}')) {
    console.warn('⚠️ Chart definition appears truncated - missing closing braces');
  }
  
  if (definition.includes('[') && definition.match(/\[/g)?.length !== definition.match(/\]/g)?.length) {
    console.warn('⚠️ Chart definition appears truncated - mismatched brackets');
  }
  
  let sanitized = definition;
  
  // Remove trailing semicolons at end of lines
  sanitized = sanitized.replace(/;(\s*$)/gm, '$1');
  
  // CRITICAL: Fix nested brackets and incomplete arrows first
  sanitized = sanitized
    // Fix nested brackets like ["[Monitor Analyze]..."] -> ["Monitor Analyze..."]
    .replace(/\["\s*\[([^\]]*)\]([^"]*?)"\s*\]/g, '["$1$2"]')
    .replace(/\[\s*\[([^\]]*)\]([^\]]*?)\s*\]/g, '["$1$2"]')
    
    // Fix incomplete arrows (-- without >) 
    .replace(/(\s+)--(\s+)(?!>|-)([A-Za-z0-9_])/g, '$1-->$3')
    .replace(/(\w|]|})(\s*)--(\s*)([A-Za-z0-9_])/g, '$1$2-->$3$4')
    
    // Fix malformed arrows with extra dashes
    .replace(/---+>/g, '-->')
    .replace(/--\s*-+>/g, '-->')
    
    // Remove lines that look completely malformed
    .split('\n')
    .filter(line => {
      const trimmedLine = line.trim();
      // Remove lines with unmatched quotes or brackets that can't be fixed
      if (trimmedLine.includes('"') && (trimmedLine.match(/"/g) || []).length % 2 !== 0) {
        console.warn('🚨 Removing line with unmatched quotes:', trimmedLine);
        return false;
      }
      // Remove lines with incomplete arrow syntax that we couldn't fix
      if (trimmedLine.match(/--\s*$/)) {
        console.warn('🚨 Removing line with incomplete arrow:', trimmedLine);
        return false;
      }
      return true;
    })
    .join('\n')
    
    // Handle problematic characters in labels
    .replace(/([A-Za-z0-9_]+)\s*\{\s*([^}]*[<>&"'`]+[^}]*)\s*\}/g, (match, nodeId, label) => {
      const cleanLabel = label
        .replace(/["'`]/g, '') // Remove quotes
        .replace(/[<>&]/g, '') // Remove HTML-like characters
        .replace(/\[[^\]]*\]/g, '') // Remove any remaining nested brackets
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      return `${nodeId}{"${cleanLabel}"}`;
    })
    
    // Handle square bracket labels with problematic characters
    .replace(/\[([^[\]]*[<>&"'`\[\]]+[^[\]]*)\]/g, (match, label) => {
      const cleanLabel = label
        .replace(/["'`]/g, '') // Remove quotes
        .replace(/[<>&]/g, '') // Remove HTML-like characters
        .replace(/\[[^\]]*\]/g, '') // Remove nested brackets
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      return `["${cleanLabel}"]`;
    })
    
    // Handle parentheses in labels that aren't properly quoted
    .replace(/\[([^[\]]*)\(([^)]*)\)([^[\]]*)\]/g, '["$1$2$3"]')
    
    // Quote labels with special characters
    .replace(/\[([^[\]"]*[,&<>'"()]+[^[\]"]*)\]/g, '["$1"]')
    
    // Fix double-quoted labels
    .replace(/\[""([^"]*)""]/g, '["$1"]')
    
    // Handle curly brace labels with special characters
    .replace(/\{([^{}]*[,&<>'"()]+[^{}]*)\}/g, '{"$1"}')
    
    // Remove any stray control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    
    // Comprehensive arrow syntax fixes
    .replace(/--+>/g, '-->')
    .replace(/-{2,}>/g, '-->')
    .replace(/=+>/g, '==>')
    .replace(/={2,}>/g, '==>')
    
    // Ensure proper spacing around arrows
    .replace(/(\w|\]|\})\s*-->\s*(\w)/g, '$1 --> $2')
    .replace(/(\w|\]|\})\s*==>\s*(\w)/g, '$1 ==> $2')
    
    // Handle node definitions that might have syntax issues
    .replace(/([A-Za-z0-9_]+)(\{[^}]*\}|\[[^\]]*\]|\([^)]*\))\s*([^-=\s\n\r][^-=\n\r]*?)(\s*(?:-->|==>|\n|\r|$))/g, 
      (match, nodeId, shape, extra, ending) => {
        if (extra.trim() && !extra.match(/^(-->|==>)/)) {
          console.warn(`⚠️ Removing extra content after node ${nodeId}: "${extra.trim()}"`);
          return `${nodeId}${shape}${ending}`;
        }
        return match;
      })
    
    // Final cleanup: normalize line endings and remove empty lines
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')
    .trim();
  
  // Final validation check
  const lines = sanitized.split('\n');
  const validatedLines = lines.filter((line, index) => {
    // Check for still problematic patterns
    if (line.match(/\["\s*\[/)) {
      console.warn(`🚨 Line ${index + 1} still has nested brackets, removing:`, line);
      return false;
    }
    if (line.match(/--\s*$/)) {
      console.warn(`🚨 Line ${index + 1} has incomplete arrow, removing:`, line);
      return false;
    }
    return true;
  });
  
  const finalSanitized = validatedLines.join('\n');
  console.log('✅ Sanitized definition:', JSON.stringify(finalSanitized));
  return finalSanitized;
};

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

CRITICAL MERMAID SYNTAX RULES:
- NEVER use special characters like <, >, &, ", ', \`, or control characters in node labels
- ALWAYS quote labels containing parentheses, commas, or special characters: ["Label with (parentheses)"]
- Use simple, clean labels without HTML-like syntax
- Ensure all brackets [], braces {}, and parentheses () are properly matched
- Use only standard ASCII characters in labels
- Keep arrow syntax simple: --> or ==>
- No trailing semicolons or extra characters after node definitions
- Example of GOOD syntax: A["Clean Label"] --> B{Simple Question?}
- Example of BAD syntax: A[Label with <bad> chars] --> B{Question (with unquoted parens)}

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
- Use meaningful node labels that explain the concept (but keep them clean and simple)
- Add styling with fill colors and stroke properties
- For processes: use flowchart TD or LR
- For sequences: use sequenceDiagram
- For state changes: use stateDiagram-v2
- For data relationships: use erDiagram
- Keep charts educational and clear
- Use decision nodes {} for branching logic
- Use action nodes [] for processes
- Use different colors to highlight key concepts
- ALWAYS validate that your Mermaid syntax is clean and parseable

Label cleaning examples:
- Instead of: A[Greenhouse gases (CO2, Methane etc.)]
- Use: A["Greenhouse gases - CO2 Methane etc"]
- Instead of: B{Is temperature > 25°C?}
- Use: B{"Is temperature above 25C?"}

Color suggestions:
- Blue (#e3f2fd, #1976d2): Start/Input
- Purple (#f3e5f5, #7b1fa2): End/Output  
- Orange (#fff3e0, #f57c00): Important processes
- Green (#e8f5e8, #388e3c): Success/Results
- Red (#ffebee, #c62828): Errors/Warnings

Remember: Create educational, clear flowcharts with CLEAN, PARSEABLE syntax that help explain the concept visually.`;
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
      } else {
        // SANITIZE THE CHART DEFINITION FROM LLM
        response.visualization.chartDefinition = sanitizeChartDefinition(response.visualization.chartDefinition);
      }

      if (!response.visualization.theme) {
        response.visualization.theme = 'default';
      }
    }

    return response;
  }

  private getDefaultChart(): string {
    return `flowchart TD
    A[Question Asked] --> B{"Understanding Level?"}
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
        chartDefinition: sanitizeChartDefinition(fallbackChart), // SANITIZE FALLBACK TOO
        theme: 'default'
      }
    };
  }

  private generateFallbackChart(type: string, question: string): string {
    const shortQuestion = question.substring(0, 20).replace(/[<>&"'`]/g, ''); // Clean question
    
    if (type === 'sequence') {
      return `flowchart LR
        A["Start: ${shortQuestion}..."] --> B[Analyze Question]
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
        
        Question: ${shortQuestion}...
        Analysis: Processing Information
        Understanding: Concept Clarity
        Response: Final Answer`;
    } else {
      return `flowchart TD
        A["${shortQuestion}..."] --> B{"Type of Question?"}
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