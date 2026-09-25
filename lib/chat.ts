import { GoogleGenAI, mcpToTool, type Content } from "@google/genai";
import { getMcpClient } from "./mcp.js";
import { asUpstream, BadRequestError, nowIso } from "./errors.js";
import type { ChatMessage, ChatResponse } from "./types.js";

export const SYSTEM_INSTRUCTION =
  "You are a Singapore-based travel planner. Default currency is SGD, written as S$. Default origin airport is SIN. " +
  "Use tools for every price, rate, forecast or traffic fact; never estimate them. If a tool fails, say which one failed " +
  "and continue with what you have. Keep answers short and in bullet points.";

const MODEL = "gemini-2.5-flash";
const SOURCE = "gemini";

export function validateMessages(input: unknown): ChatMessage[] {
  const body = (input ?? {}) as { messages?: unknown };
  if (!Array.isArray(body.messages) || body.messages.length === 0) throw new BadRequestError("Body must be { messages: [{ role, content }] }");
  const messages: ChatMessage[] = body.messages.map((m: unknown) => {
    const x = (m ?? {}) as { role?: unknown; content?: unknown };
    if ((x.role !== "user" && x.role !== "assistant") || typeof x.content !== "string" || !x.content.trim()) {
      throw new BadRequestError('Each message needs role "user" | "assistant" and non-empty string content');
    }
    return { role: x.role, content: x.content };
  });
  if (messages[messages.length - 1].role !== "user") throw new BadRequestError("The last message must be from the user");
  return messages.slice(-20);
}

export async function chat(messages: ChatMessage[]): Promise<ChatResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw asUpstream(SOURCE, new Error("GEMINI_API_KEY is not set"));
  try {
    const client = await getMcpClient();
    const ai = new GoogleGenAI({ apiKey });
    const contents: Content[] = messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [mcpToTool(client)],
        // The SDK runs the tool-call loop itself; MCP tools are read-only queries.
        automaticFunctionCalling: { maximumRemoteCalls: 10 },
      },
    });
    const history = response.automaticFunctionCallingHistory ?? [];
    const toolsUsed = Array.from(
      new Set(
        history
          .flatMap((c) => c.parts ?? [])
          .map((p) => p.functionCall?.name)
          .filter((n): n is string => typeof n === "string" && n.length > 0),
      ),
    );
    return { text: response.text ?? "", tools_used: toolsUsed, source: `${SOURCE}:${MODEL}`, fetched_at: nowIso() };
  } catch (err) {
    throw asUpstream(SOURCE, err);
  }
}
