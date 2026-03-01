import type { Plugin } from "@opencode-ai/plugin"

const PROXY_PORT = 9876
const NIM_BASE = "https://integrate.api.nvidia.com/v1"

// In-memory circular log buffer exposed at /_debug to avoid file I/O in
// sandboxed environments. Use curl http://localhost:9876/_debug to poll.
const logs: string[] = []
const log = (msg: string) => {
  try {
    logs.push(msg)
    if (logs.length > 200) logs.shift()
  } catch (e) {
    // swallow logging errors
  }
}

export default (async function NimProxy(_ctx: any) {
  // Start a Bun HTTP server that proxies to NIM and patches missing `id`
  const server = Bun.serve({
    port: PROXY_PORT,
    async fetch(req) {
      // Incoming requests will be directed at the proxy base (we expect callers
      // to point their baseURL to http://localhost:9876/v1). Strip the leading
      // `/v1` prefix so we don't duplicate it when forwarding to NIM.
      const url = new URL(req.url)

      // Debug endpoint returns recent logs
      if (url.pathname === '/_debug') {
        return new Response(logs.join('\n'), { headers: { 'content-type': 'text/plain' } })
      }
      let upstreamPath = url.pathname
      if (upstreamPath === '/v1') upstreamPath = ''
      else if (upstreamPath.startsWith('/v1/')) upstreamPath = upstreamPath.replace(/^\/v1/, '')

      const upstream = `${NIM_BASE}${upstreamPath}${url.search}`

      const headers = new Headers(req.headers)
      headers.delete("host")

      const upstreamResp = await fetch(upstream, {
        method: req.method,
        headers,
        body: req.body,
      })

      const contentType = upstreamResp.headers.get("content-type") ?? ""
      // Log content-type and status so we can tell if NIM is returning SSE/streaming
      log(`[nim-proxy] content-type: ${contentType} status: ${upstreamResp.status} upstream: ${upstream}`)

      // Patch SSE streaming responses line-by-line, buffering across reads so
      // that JSON `data:` lines split across chunks are reconstructed before
      // parsing. This avoids partial JSON causing unpatched lines or stray
      // characters appearing in the downstream client.
      if (contentType.includes("text/event-stream")) {
        const reader = upstreamResp.body!.getReader()
        const decoder = new TextDecoder()
        const encoder = new TextEncoder()
        let buffer = ""

        // Debugging: enable by setting NIM_PROXY_DEBUG=1 in the environment.
        const debug = !!process.env.NIM_PROXY_DEBUG
        const maxLogs = Number(process.env.NIM_PROXY_DEBUG_MAX ?? 5)
        let logged = 0

        const stream = new ReadableStream({
          async pull(controller) {
            const { done, value } = await reader.read()
            if (done) {
              controller.close()
              return
            }

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            // Keep the last (potentially incomplete) line in the buffer
            buffer = lines.pop() ?? ""

            const patched = lines
              .map(line => {
                if (!line.startsWith("data: ")) return line

                // NIM sometimes concatenates multiple data payloads on one line;
                // split on boundaries where one JSON object ends and the next
                // "data: " begins. Use a lookbehind to split after a '}' that
                // ends a JSON object followed by optional whitespace and 'data: '.
                const segments = line.split(/(?<=\})\s*data: /)

                return segments
                  .map(segment => {
                    const dataLine = segment.startsWith("data: ") ? segment : `data: ${segment}`
                    const json = dataLine.slice(6).trim()
                    if (json === "[DONE]") return dataLine
                    try {
                      const chunk = JSON.parse(json)
                      if (!chunk.id || typeof chunk.id !== "string") {
                        chunk.id = `msg_${crypto.randomUUID()}`
                      }

                      for (const choice of chunk.choices ?? []) {
                        const delta = choice.delta ?? {}

                        // Transform NIM's inline tool call format to proper OpenAI tool_calls deltas
                        if (typeof delta.content === "string" && delta.content.includes("◁tool_call_argument_begin▷")) {
                          // Extract text before any tool call
                          const parts = delta.content.split(/functions\.\w+:\d+◁tool_call_argument_begin▷[\s\S]*?◁tool_call_argument_end▷/g)
                          const textContent = parts.join("").trim()

                          // Extract all tool calls
                          const toolCallRegex = /functions\.(\w+):(\d+)◁tool_call_argument_begin▷([\s\S]*?)◁tool_call_argument_end▷/g
                          const toolCalls: any[] = []
                          let match: RegExpExecArray | null
                          while ((match = toolCallRegex.exec(delta.content)) !== null) {
                            const [, name, index, args] = match
                            toolCalls.push({
                              index: parseInt(index),
                              id: `call_${crypto.randomUUID()}`,
                              type: "function",
                              function: {
                                name,
                                arguments: args,
                              },
                            })
                          }

                          // Replace content with clean text and add proper tool_calls
                          delta.content = textContent || null
                          if (toolCalls.length > 0) {
                            delta.tool_calls = toolCalls
                          }
                        }

                        // Patch any remaining missing ids on existing tool_calls
                        for (const call of delta.tool_calls ?? []) {
                          if (!call.id || typeof call.id !== "string") call.id = `call_${crypto.randomUUID()}`
                          if (call.function && (!call.function.name || typeof call.function.name !== "string")) {
                            call.function.name = ""
                          }
                        }
                      }

                      if (debug && logged < maxLogs) {
                        log(`[nim-proxy] patched chunk id=${chunk.id} snippet=${JSON.stringify(chunk).slice(0,1000)}`)
                        logged++
                      }

                      return `data: ${JSON.stringify(chunk)}`
                    } catch {
                      return dataLine
                    }
                  })
                  .join("\n")
              })
              .join("\n") + "\n\n"

            controller.enqueue(encoder.encode(patched))
          },
        })

        // Clone headers and remove content-length to allow chunked transfer
        const headers = new Headers(upstreamResp.headers)
        headers.delete("content-length")

        return new Response(stream, {
          status: upstreamResp.status,
          headers,
        })
      }

      // Only patch JSON responses (non-streaming)
      if (contentType.includes("application/json")) {
        const body = await upstreamResp.json() as any

        if (!body.id || typeof body.id !== "string") {
          body.id = `msg_${crypto.randomUUID()}`
        }

        // Also patch tool_calls entries missing `id`
        for (const choice of body.choices ?? []) {
          for (const call of choice.message?.tool_calls ?? []) {
            if (!call.id || typeof call.id !== "string") {
              call.id = `call_${crypto.randomUUID()}`
            }
          }
        }

        return new Response(JSON.stringify(body), {
          status: upstreamResp.status,
          headers: { "content-type": "application/json" },
        })
      }

      // Default: passthrough
      return new Response(upstreamResp.body, {
        status: upstreamResp.status,
        headers: upstreamResp.headers,
      })
    },
  })

  // Log so it's obvious the proxy started
  log(`NIM proxy listening on http://localhost:${PROXY_PORT}/v1 -> ${NIM_BASE}`)

  return {}
} as Plugin)
