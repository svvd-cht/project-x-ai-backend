
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
    const body = (await request.json()) as {
      command?: string;
      messages?: ChatMessage[];
    };

    let messages: ChatMessage[];

    if (typeof body.command === "string" && body.command.trim()) {
      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: body.command.trim() },
      ];
    } else if (
      Array.isArray(body.messages) &&
      body.messages.length > 0
    ) {
      messages = body.messages;

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
