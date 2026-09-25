import { GoogleGenAI, mcpToTool } from '@google/genai';
import { getMcpClient, sanitizeError } from './mcp.js';

export interface ChatMessage {
  role: 'user' | 'model' | 'assistant';
  content?: string;
  text?: string;
}

export interface ChatResult {
  text: string;
  tools_used: string[];
}

export async function handleChat(params: { messages: ChatMessage[] }): Promise<ChatResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('GEMINI_API_KEY environment variable is not configured');
  }

  const rawClient = await getMcpClient();
  const toolsCalled = new Set<string>();

  // Proxy the MCP client to track which tools get invoked by Gemini
  const trackedClient = new Proxy(rawClient, {
    get(target, prop, receiver) {
      if (prop === 'callTool') {
        return async (toolParams: any, options: any) => {
          if (toolParams?.name) {
            toolsCalled.add(toolParams.name);
          }
          return await (target as any).callTool(toolParams, options);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Prepare contents for Gemini generateContent
  const contents = (params.messages || []).map((msg) => {
    const role = msg.role === 'assistant' ? 'model' : msg.role;
    const textContent = msg.content || msg.text || '';
    return {
      role,
      parts: [{ text: textContent }],
    };
  });

  if (contents.length === 0) {
    contents.push({
      role: 'user',
      parts: [{ text: 'Hello, please help me plan a trip from Singapore.' }],
    });
  }

  try {
    const callableTool = mcpToTool(trackedClient);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction:
          'You are a Singapore-based travel planner. Default currency is SGD, written as S$. Default origin airport is SIN. Use tools for every price, rate, forecast or traffic fact; never estimate them. If a tool fails, say which one failed and continue with what you have. Keep answers short and in bullet points.',
        tools: [callableTool],
      },
    });

    if (response.functionCalls) {
      for (const fc of response.functionCalls) {
        if (fc.name) toolsCalled.add(fc.name);
      }
    }

    return {
      text: response.text || 'No response generated.',
      tools_used: Array.from(toolsCalled),
    };
  } catch (err) {
    const sanitized = sanitizeError(err);
    throw new Error(`Gemini chat failed: ${sanitized}`);
  }
}
