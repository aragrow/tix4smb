/**
 * Unified LLM client — adapts Anthropic, OpenAI, and Google Gemini
 * to a single agentic-loop interface used by the ticket agent.
 */
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI, FunctionCallingMode } from '@google/generative-ai';
import type { AIProvider } from './aiConfig';

// ─── Shared types ───────────────────────────────────────────────────────────

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema object
}

export type ToolExecutor = (
  name: string,
  input: Record<string, unknown>
) => Promise<unknown>;

export interface AgentOptions {
  provider: AIProvider;
  model: string;
  apiKey: string;
  system: string;
  userMessage: string;
  tools: ToolDef[];
  executeTool: ToolExecutor;
  /** Called each time the model invokes the submit_tasks tool */
  onTasks: (tasks: Array<{ description: string }>) => Promise<void>;
  maxIterations?: number;
}

// ─── Anthropic ──────────────────────────────────────────────────────────────

async function runAnthropic(opts: AgentOptions): Promise<void> {
  const client = new Anthropic({ apiKey: opts.apiKey });
  const max = opts.maxIterations ?? 6;

  const tools: Anthropic.Tool[] = opts.tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as Anthropic.Tool['input_schema'],
  }));

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: opts.userMessage },
  ];

  for (let i = 0; i < max; i++) {
    const response = await client.messages.create({
      model: opts.model,
      max_tokens: 4096,
      system: opts.system,
      tools,
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') break;
    if (response.stop_reason !== 'tool_use') break;

    const results: Anthropic.ToolResultBlockParam[] = [];
    let done = false;

    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      const input = block.input as Record<string, unknown>;

      if (block.name === 'submit_tasks') {
        await opts.onTasks((input.tasks as Array<{ description: string }>) ?? []);
        results.push({ type: 'tool_result', tool_use_id: block.id, content: 'Done.' });
        done = true;
      } else {
        const result = await opts.executeTool(block.name, input);
        results.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
    }

    messages.push({ role: 'user', content: results });
    if (done) break;
  }
}

// ─── OpenAI ─────────────────────────────────────────────────────────────────

async function runOpenAI(opts: AgentOptions): Promise<void> {
  const client = new OpenAI({ apiKey: opts.apiKey });
  const max = opts.maxIterations ?? 6;

  const tools: OpenAI.ChatCompletionTool[] = opts.tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: opts.system },
    { role: 'user', content: opts.userMessage },
  ];

  for (let i = 0; i < max; i++) {
    const response = await client.chat.completions.create({
      model: opts.model,
      tools,
      messages,
    });

    const msg = response.choices[0].message;
    messages.push(msg);

    if (response.choices[0].finish_reason === 'stop') break;
    if (!msg.tool_calls?.length) break;

    let done = false;

    for (const tc of msg.tool_calls) {
      const input = JSON.parse(tc.function.arguments) as Record<string, unknown>;

      if (tc.function.name === 'submit_tasks') {
        await opts.onTasks((input.tasks as Array<{ description: string }>) ?? []);
        messages.push({ role: 'tool', tool_call_id: tc.id, content: 'Done.' });
        done = true;
      } else {
        const result = await opts.executeTool(tc.function.name, input);
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }

    if (done) break;
  }
}

// ─── Google Gemini ──────────────────────────────────────────────────────────

async function runGemini(opts: AgentOptions): Promise<void> {
  const genAI = new GoogleGenerativeAI(opts.apiKey);
  const max = opts.maxIterations ?? 6;

  // Gemini uses functionDeclarations format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const functionDeclarations = opts.tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));

  const model = genAI.getGenerativeModel({
    model: opts.model,
    systemInstruction: opts.system,
    tools: [{ functionDeclarations }],
    toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const history: any[] = [];
  const chat = model.startChat({ history });

  let userMsg: string = opts.userMessage;

  for (let i = 0; i < max; i++) {
    const result = await chat.sendMessage(userMsg);
    const response = result.response;
    const parts = response.candidates?.[0]?.content?.parts ?? [];

    const fnCalls = parts.filter((p: { functionCall?: unknown }) => p.functionCall);
    if (!fnCalls.length) break; // no tool calls → done

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fnResults: any[] = [];
    let done = false;

    for (const part of fnCalls) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fc = (part as any).functionCall as { name: string; args: Record<string, unknown> };

      if (fc.name === 'submit_tasks') {
        await opts.onTasks((fc.args.tasks as Array<{ description: string }>) ?? []);
        fnResults.push({ functionResponse: { name: fc.name, response: { result: 'Done.' } } });
        done = true;
      } else {
        const res = await opts.executeTool(fc.name, fc.args);
        fnResults.push({ functionResponse: { name: fc.name, response: { result: JSON.stringify(res) } } });
      }
    }

    if (done) break;
    // Send function results back
    const nextResult = await chat.sendMessage(fnResults);
    // Check if the model wants to do more tool calls
    const nextParts = nextResult.response.candidates?.[0]?.content?.parts ?? [];
    const moreCalls = nextParts.filter((p: { functionCall?: unknown }) => p.functionCall);
    if (!moreCalls.length) break;
    // Loop will pick up from here via the chat history
    userMsg = JSON.stringify(fnResults); // won't be used if history is maintained
    i++; // account for the extra round
  }
}

// ─── Public entry point ─────────────────────────────────────────────────────

export async function runAgentLoop(opts: AgentOptions): Promise<void> {
  switch (opts.provider) {
    case 'anthropic': return runAnthropic(opts);
    case 'openai':    return runOpenAI(opts);
    case 'google':    return runGemini(opts);
    default: throw new Error(`Unknown provider: ${opts.provider as string}`);
  }
}
