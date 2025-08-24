// import { NextRequest } from "next/server";
// import OpenAI from "openai";

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// const RETRIEVER_BASE_URL = process.env.RETRIEVER_BASE_URL || "http://127.0.0.1:8000";

// const routerSystem = `
// You are a router that picks one agent for a user query.
// Agents:
// - policy: HR, leave, perks, company policies.
// - domain: product/domain knowledge, onboarding, industry workflows.
// - docs: technical documentation, APIs, code, debugging.
// Respond with exactly one word: policy, domain, or docs.
// `.trim();

// async function routeAgent(query: string): Promise<"policy"|"domain"|"docs"> {
//   const r = await openai.chat.completions.create({
//     model: "gpt-4o-mini",
//     messages: [
//       { role: "system", content: routerSystem },
//       { role: "user", content: query }
//     ],
//     temperature: 0,
//   });
//   const pick = r.choices[0].message?.content?.trim().toLowerCase();
//   if (pick === "policy" || pick === "domain" || pick === "docs") return pick;
//   return "domain"; // safe default
// }

// async function retrieve(agent: string, query: string, k = 4) {
//   const resp = await fetch(`${RETRIEVER_BASE_URL}/search`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ collection: agent, query, k }),
//   });
//   if (!resp.ok) throw new Error(`Retriever error: ${resp.status}`);
//   const data = await resp.json();
//   return data.results as { id: string; content: string; metadata?: any }[];
// }

// export async function POST(req: NextRequest) {
//   const { query } = await req.json();

//   // 1) route
//   const agent = await routeAgent(query);

//   // 2) retrieve
//   const results = await retrieve(agent, query, 4);
//   const contextBlocks = results.map((r, i) =>
//     `[#${i+1}] ${r.metadata?.title ?? "(no title)"}\n${r.content}`
//   ).join("\n\n---\n\n");

//   // 3) stream final answer
//   const system = `You are the ${agent} assistant. Use the context to answer accurately.
// If the answer isn't in the context, say you don't know. Cite sources like [#1], [#2].`;

//   const stream = await openai.chat.completions.create({
//     model: "gpt-4o-mini",
//     stream: true,
//     temperature: 0.2,
//     messages: [
//       { role: "system", content: system },
//       { role: "user", content: `User question:\n${query}\n\nContext:\n${contextBlocks}` }
//     ],
//   });

//   const encoder = new TextEncoder();
//   const readable = new ReadableStream({
//     async start(controller) {
//       try {
//         for await (const part of stream) {
//           const text = part.choices[0]?.delta?.content || "";
//           if (text) controller.enqueue(encoder.encode(text));
//         }
//       } catch (e) {
//         controller.enqueue(encoder.encode("\n\n[Error streaming response]"));
//       } finally {
//         controller.close();
//       }
//     }
//   });

//   return new Response(readable, {
//     headers: { "Content-Type": "text/plain; charset=utf-8" },
//   });
// }

import { NextRequest } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const RETRIEVER_BASE_URL = process.env.RETRIEVER_BASE_URL || "http://127.0.0.1:8000";

const MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b"; // change if you want smaller/faster

const routerSystem = `
You are a router that picks one agent for a user query.
Agents:
- policy: HR, leave, perks, company policies.
- domain: product/domain knowledge, onboarding, industry workflows.
- docs: technical documentation, APIs, code, debugging.
Respond with exactly one word: policy, domain, or docs.
`.trim();

async function callOllama(messages: { role: string; content: string }[], stream = false) {
  const resp = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, stream }),
  });

  if (stream) {
    return resp.body; // return ReadableStream directly
  } else {
    const data = await resp.json();
    return data.message?.content || "";
  }
}

async function routeAgent(query: string): Promise<"policy"|"domain"|"docs"> {
  const pick = await callOllama(
    [
      { role: "system", content: routerSystem },
      { role: "user", content: query }
    ],
    false
  );

  const choice = pick.trim().toLowerCase();
  if (choice === "policy" || choice === "domain" || choice === "docs") return choice;
  return "domain"; // safe default
}

async function retrieve(agent: string, query: string, k = 4) {
  const resp = await fetch(`${RETRIEVER_BASE_URL}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collection: agent, query, k }),
  });
  if (!resp.ok) throw new Error(`Retriever error: ${resp.status}`);
  const data = await resp.json();
  return data.results as { id: string; content: string; metadata?: any }[];
}

export async function POST(req: NextRequest) {
  const { query } = await req.json();

  // 1) route
  const agent = await routeAgent(query);

  // 2) retrieve
  const results = await retrieve(agent, query, 4);
  const contextBlocks = results.map((r, i) =>
    `[#${i+1}] ${r.metadata?.title ?? "(no title)"}\n${r.content}`
  ).join("\n\n---\n\n");

  // 3) stream final answer with Ollama
  const system = `You are the ${agent} assistant. Use the context to answer accurately.
If the answer isn't in the context, say you don't know. Cite sources like [#1], [#2].`;

  const body = JSON.stringify({
    model: MODEL,
    stream: true,
    messages: [
      { role: "system", content: system },
      { role: "user", content: `User question:\n${query}\n\nContext:\n${contextBlocks}` }
    ]
  });

  const resp = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  });

  const encoder = new TextEncoder();
  const reader = resp.body!.getReader();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += new TextDecoder().decode(value);

          // Ollama streams JSONL, parse line by line
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const data = JSON.parse(line);
            const text = data.message?.content || "";
            if (text) controller.enqueue(encoder.encode(text));
          }
        }
      } catch (e) {
        controller.enqueue(encoder.encode("\n\n[Error streaming response]"));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
