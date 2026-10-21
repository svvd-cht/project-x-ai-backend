
import { Env, ChatMessage } from "./types";

const MODEL_ID = "@cf/meta/llama-3.1-8b-instruct-fp8";

const SYSTEM_PROMPT =
  "You are Project X, a smart, friendly voice assistant. Answer accurately and naturally. Be concise and make answers easy to understand when spoken aloud.";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    if (url.pathname !== "/api/chat") {
      return new Response("Not found", { status: 404 });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    return handleChatRequest(request, env);
  },
} satisfies ExportedHandler<Env>;

async function handleChatRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const contentType = request.headers.get("Content-Type") || "";
    let command = "";
    let history = "";
    let suppliedMessages: ChatMessage[] | undefined;

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        command?: string;
        messages?: ChatMessage[];
      };

      command = typeof body.command === "string"
        ? body.command.trim()
        : "";

      suppliedMessages = body.messages;
    } else {
      const form = new URLSearchParams(await request.text());
      command = (form.get("command") || "").trim();
      history = form.get("history") || "";
    }

    let messages: ChatMessage[];

    if (command) {
      messages = [
        { role: "system", content: SYSTEM_PROMPT },
      ];

      if (history.trim()) {
        messages.push({
          role: "system",
          content:
            "Conversation history from this session. Use it to answer follow-up questions accurately:\n" +
            history.slice(-12000),
        });
      }

      messages.push({ role: "user", content: command });
    } else if (
      Array.isArray(suppliedMessages) &&
      suppliedMessages.length > 0
    ) {
      messages = [...suppliedMessages];

      if (!messages.some((message) => message.role === "system")) {
        messages.unshift({
          role: "system",
          content: SYSTEM_PROMPT,
        });
      }
    } else {
      return Response.json(
        { error: "Please provide a command or messages." },
        { status: 400 },
      );
    }

    const result = (await env.AI.run(MODEL_ID, {
      messages,
      max_tokens: 512,
    })) as { response?: string };

    const answer = result.response;

    if (typeof answer !== "string" || !answer.trim()) {
      return Response.json(
        { error: "The AI returned an empty response." },
        { status: 502 },
      );
    }

    return new Response(answer.trim(), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Project X request failed:", error);

    return Response.json(
      { error: "Project X could not process your request." },
      { status: 500 },
    );
  }
}
