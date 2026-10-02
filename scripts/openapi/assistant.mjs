// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: RevenueDot AI, the in-app assistant (conversations, streaming, files, mentions, settings) and the public first-sale share card. All are RevenueDot extensions.
// Docs: https://revenuedot.app/docs/guides/revenuedot-ai   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { NONE, SECRET, SESSION, arr, body, bool, en, int, listOf, ms, nstr, num, obj, ok, op, param, str, v2Errors } from "./common.mjs";

const P = "/v2/projects/{project_id}";
const project = param("ProjectId");
const E = (...c) => v2Errors(401, 403, ...c);
const AI = "routes/v2/assistant.ts";
const x = { extension: true, security: SECRET };
const s = { extension: true, security: SESSION };
const conversationId = { name: "conversation_id", in: "path", required: true, schema: str("A conversation id (aic...).") };
const fileId = { name: "file_id", in: "path", required: true, schema: str("A file id (aif...).") };
const usage = obj({ turns: int(), tokens: int() });

const status = obj({
  object: en(["ai_status"]), configured: bool("A model is configured on this server."), available: bool("The model is configured and the project allows the assistant."),
  provider: nstr("Workers AI, Anthropic or OpenAI."), model: nstr("The model id, e.g. @cf/moonshotai/kimi-k2.6, claude-opus-5-5, gpt-6-astra."),
  runtime: en(["durable_object", "sse"], "`durable_object` on RevenueDot Cloud (one Cloudflare Agents Durable Object per conversation, WebSocket); `sse` on self-host (Postgres, Server-Sent Events)."),
  access: en(["read_write", "read_only", "disabled"]), role: str("The caller's role (admin, developer, viewer) or `api_key`."), can_read: bool(), can_write: bool("Write tools are offered (they still ask for approval)."),
  reason: nstr("Why the assistant cannot read or write, in words the dashboard shows."), greeting_name: nstr("The first name the empty page greets."),
  tools: arr(obj({ name: str(), title: str(), write: bool() }), { description: "The tools this person would be offered." }),
  usage: { ...obj({ user: usage, project: usage, server: usage }), type: ["object", "null"], description: "Today's turns and tokens (UTC). Null for API keys." },
  caps: obj({ userPerMinute: int(), userTurnsPerDay: int(), userTokensPerDay: int(), projectTurnsPerDay: int(), projectTokensPerDay: int(), serverTurnsPerDay: int(), serverTokensPerDay: int() }),
}, ["object", "configured", "available", "runtime", "access"]);

const conversation = obj({
  object: en(["ai_conversation"]), id: str(), title: str("The first question, or the name given with rename."), runtime: en(["durable_object", "postgres"]),
  created_at: ms("Created."), updated_at: ms("Last activity."),
}, ["object", "id", "title", "runtime"]);
const uiMessage = obj({
  id: str(), role: en(["user", "assistant"]), parts: arr({ type: "object", description: "AI SDK UI message parts: `text`, `file`, `tool-<name>` (with `state`, `input`, `output`, `approval`), `step-start`." }),
  metadata: obj({ mentions: arr(obj({ type: en(["customer", "offering", "chart"]), id: str(), label: str(),
    params: { type: "object", additionalProperties: { type: "string" }, description: "A chart mention's view, as the chart page's Ask AI sends it: `start_date`, `end_date`, `resolution`, `segment`, `filters`, `selectors`, `environment`. Other keys are ignored." } }, ["type", "id"])) }),
}, ["id", "role", "parts"]);
const conversationDetail = { allOf: [conversation, obj({
  messages: arr(uiMessage, { description: "The transcript (self-host runtime; empty for Durable Object conversations, whose messages live in the object)." }),
  streaming: bool("An answer is being written now; GET …/stream resumes it."),
  last_stream: { ...obj({ status: en(["done", "error", "stopped", "interrupted"]), error: nstr() }), type: ["object", "null"] },
})] };
const sse = (description) => ({ description, content: { "text/event-stream": { schema: str("AI SDK UI message stream: `data: <chunk JSON>` lines (start, text-delta, tool-input-available, tool-approval-request, tool-output-available, error, finish ...), ending with `data: [DONE]`.") } } });
const storekitProduct = obj({
  productId: str(), referenceName: str(), type: en(["consumable", "non_consumable", "subscription", "non_renewing_subscription"]), price: { type: ["number", "null"] },
  duration: nstr("ISO 8601 period of an auto-renewing subscription."), group: nstr(), groupLevel: { type: ["integer", "null"] }, familyShareable: bool(), displayName: nstr(), description: nstr(),
  locales: arr(str()), introOffer: { ...obj({ mode: en(["free_trial", "pay_as_you_go", "pay_up_front"]), period: nstr(), periods: int(), price: { type: ["number", "null"] } }), type: ["object", "null"] },
  promotionalOffers: int(), offerCodes: int(),
});
const storekit = obj({ formatVersion: { type: ["integer", "null"] }, storefront: nstr(), locale: nstr(), products: arr(storekitProduct), groups: arr(obj({ id: nstr(), name: str(), products: arr(str()) })), warnings: arr(str()) });
const file = obj({ object: en(["ai_file"]), id: str(), name: str(), media_type: str(), size: int(), url: str("Where the file is read back (a project member's session)."), storekit: { ...storekit, description: "Present for a .storekit file: what it holds." } }, ["object", "id", "url"]);
const firstSale = obj({
  object: en(["first_sale"]),
  card: { ...obj({
    id: str("The share token."), project_name: str(), product: str(), store: str(), country: nstr(), amount: { type: ["number", "null"] }, currency: nstr(), revenue_usd: num(),
    purchased_at: ms("The first paid production purchase."), share_url: str("Public page with Open Graph tags."), image_url: str("The 1200×630 SVG card."), dismissed: bool("Hidden on the Overview."),
  }), type: ["object", "null"] },
});
const locked = { 423: { description: "An answer is still being written in this conversation.", content: { "application/json": { schema: { $ref: "#/components/schemas/V2Error" } } } } };

export const assistantPaths = {
  [`${P}/ai`]: {
    get: op({ ...x, id: "getAiStatus", tag: "RevenueDot AI", summary: "What RevenueDot AI can do here", source: AI, parameters: [project],
      description: "The model, the runtime, the project's AI setting, the caller's role and what follows from them, and today's usage against the caps.",
      responses: { 200: ok("Status.", status), ...E(404) } }),
  },
  [`${P}/ai/settings`]: {
    post: op({ ...x, id: "updateAiSettings", tag: "RevenueDot AI", summary: "Set what RevenueDot AI may do in the project", source: AI, parameters: [project], scopes: ["project_configuration:projects:read_write"],
      description: "`read_write`: reads, and writes after the user approves each one in the chat. `read_only`: no write tools. `disabled`: no assistant. Dashboard users must be admins.",
      requestBody: body(obj({ access: en(["read_write", "read_only", "disabled"]) }, ["access"]), { access: "read_only" }),
      responses: { 200: ok("Saved.", obj({ object: en(["ai_settings"]), access: str() })), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/ai/conversations`]: {
    get: op({ ...s, id: "listAiConversations", tag: "RevenueDot AI", summary: "List your conversations, newest first", source: AI,
      parameters: [project, { name: "q", in: "query", schema: str("Words in the title.") }], responses: { 200: ok("Conversations.", listOf(conversation)), ...E(404) } }),
    post: op({ ...s, id: "createAiConversation", tag: "RevenueDot AI", summary: "Start a conversation", source: AI, parameters: [project],
      requestBody: body(obj({ title: nstr("Optional; the first question becomes the title otherwise.") }), {}, false),
      responses: { 201: ok("The conversation.", conversation), ...v2Errors(400, 401, 403, 404, 503) } }),
  },
  [`${P}/ai/conversations/{conversation_id}`]: {
    get: op({ ...s, id: "getAiConversation", tag: "RevenueDot AI", summary: "Get a conversation with its messages", source: AI, parameters: [project, conversationId], responses: { 200: ok("The conversation.", conversationDetail), ...E(404) } }),
    post: op({ ...s, id: "renameAiConversation", tag: "RevenueDot AI", summary: "Rename a conversation", source: AI, parameters: [project, conversationId],
      requestBody: body(obj({ title: str() }, ["title"]), { title: "September churn" }), responses: { 200: ok("The conversation.", conversation), ...v2Errors(400, 401, 403, 404) } }),
    delete: op({ ...s, id: "deleteAiConversation", tag: "RevenueDot AI", summary: "Delete a conversation", source: AI, parameters: [project, conversationId],
      description: "Deletes the conversation and its messages (on Cloud, its Durable Object). Changes the assistant made stay, and stay in the audit log.",
      responses: { 200: ok("Deleted.", obj({ object: en(["ai_conversation"]), id: str(), deleted: bool() })), ...E(404) } }),
  },
  [`${P}/ai/conversations/{conversation_id}/chat`]: {
    post: op({ ...s, id: "chatAiConversation", tag: "RevenueDot AI", summary: "Send a message and stream the answer (self-host)", source: AI, parameters: [project, conversationId],
      description: [
        "Self-host runtime. Send a user message, or the last assistant message back with approval decisions on its `tool-<name>` parts (`approval: { id, approved }`): only the decisions are taken, everything else comes from the stored transcript.",
        "`trigger: regenerate-message` drops the last answer and asks again. Write tools always stop at `tool-approval-request` until the user approves, and each approval runs its write once: sending it again, or from two tabs at once, does not repeat the change. A refused turn (caps, AI setting) answers a stream with one `error` chunk.",
        "Writes with the session cookie must come from the dashboard's own origin; a request a browser marks `Sec-Fetch-Site: cross-site` or `same-site` is refused with 403.",
        "On RevenueDot Cloud conversations run in Durable Objects instead: connect a WebSocket to `/agents/assistant-agent/{conversation_id}` (Cloudflare Agents `useAgentChat`).",
      ].join("\n\n"),
      requestBody: body(obj({ trigger: en(["submit-message", "regenerate-message"]), messageId: str(), message: uiMessage }), {
        trigger: "submit-message", message: { id: "u1", role: "user", parts: [{ type: "text", text: "How is revenue doing this month?" }], metadata: { mentions: [{ type: "chart", id: "mrr", label: "MRR" }] } },
      }),
      responses: { 200: sse("The answer, streamed."), ...v2Errors(400, 401, 403, 404, 503), ...locked } }),
  },
  [`${P}/ai/conversations/{conversation_id}/stream`]: {
    get: op({ ...s, id: "resumeAiConversation", tag: "RevenueDot AI", summary: "Resume the answer being written", source: AI, parameters: [project, conversationId],
      description: "Replays the answer's chunks stored so far, then follows it to the end. A stream with no new chunk for 60 seconds is marked interrupted.",
      responses: { 200: sse("The answer from its first chunk."), 204: { description: "Nothing is being written." }, ...E(404) } }),
  },
  [`${P}/ai/conversations/{conversation_id}/stop`]: {
    post: op({ ...s, id: "stopAiConversation", tag: "RevenueDot AI", summary: "Stop the answer being written", source: AI, parameters: [project, conversationId],
      responses: { 200: ok("Stopped.", obj({ object: en(["ai_conversation"]), id: str(), stopped: bool() })), ...E(404) } }),
  },
  [`${P}/ai/files`]: {
    post: op({ ...s, id: "uploadAiFile", tag: "RevenueDot AI", summary: "Attach an image or a .storekit file", source: AI,
      parameters: [project, { name: "name", in: "query", schema: str("File name; a name ending in .storekit is read as a StoreKit configuration.") }],
      description: "The raw file is the body. PNG, JPEG, WebP or GIF up to 5 MB (`Content-Type` names the type and the bytes must be that type), or a .storekit file up to 1 MB (at most 500 products are read). 60 uploads an hour per person. Reference it in a message as a `file` part with the returned `url`; at most 4 files per message.",
      requestBody: { required: true, content: { "image/png": { schema: str(undefined, { format: "binary" }) }, "image/jpeg": { schema: str(undefined, { format: "binary" }) }, "image/webp": { schema: str(undefined, { format: "binary" }) }, "image/gif": { schema: str(undefined, { format: "binary" }) }, "application/octet-stream": { schema: str(undefined, { format: "binary" }) } } },
      responses: { 201: ok("The file.", file), ...v2Errors(400, 401, 403, 404, 429, 503) } }),
  },
  [`${P}/ai/files/{file_id}`]: {
    get: op({ ...s, id: "getAiFile", tag: "RevenueDot AI", summary: "Read an attachment back", source: AI,
      description: "Any member of the project (and the assistant, for an attached .storekit file). Secret API keys get 403.",
      parameters: [project, fileId, { name: "format", in: "query", schema: en(["text", "storekit"], "`text`: the file as text; `storekit`: the parsed StoreKit configuration. Leave out for the bytes.") }],
      responses: { 200: { description: "The image bytes, or JSON for `format`.", content: { "image/png": {}, "application/json": { schema: obj({ object: str(), id: str(), name: str(), text: str(), storekit }) } } }, ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/ai/storekit`]: {
    post: op({ ...s, id: "parseStoreKit", tag: "RevenueDot AI", summary: "Read a .storekit file", source: AI, parameters: [project],
      description: "Parses a StoreKit configuration file (Xcode's JSON, format versions 1 to 4) and returns its products without saving anything.",
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", description: "The .storekit file's JSON." } } } },
      responses: { 200: ok("What the file holds.", { allOf: [obj({ object: en(["storekit_config"]) }), storekit] }), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/ai/mentions`]: {
    get: op({ ...s, id: "listAiMentions", tag: "RevenueDot AI", summary: "Suggestions for @ mentions", source: AI,
      parameters: [project, { name: "q", in: "query", schema: str("What was typed after @: the start of an app user id, an offering, or a chart name.") }],
      description: "Up to five customers (app user ids starting with `q`), offerings and charts, each limited to what the caller's role can read.",
      responses: { 200: ok("Suggestions.", obj({ object: en(["list"]), items: arr(obj({ type: en(["customer", "offering", "chart"]), id: str(), label: str(), detail: str() })) })), ...E(404) } }),
  },
  [`${P}/ai/first_sale`]: {
    get: op({ ...x, id: "getFirstSaleCard", tag: "RevenueDot AI", summary: "The project's first-sale card", source: AI, parameters: [project],
      description: "Made when the project's first paid production purchase arrives (within 14 days of it; older projects get none). The card holds no personal data.",
      responses: { 200: ok("The card, or `card: null`.", firstSale), ...E(404) } }),
  },
  [`${P}/ai/first_sale/dismiss`]: {
    post: op({ ...s, id: "dismissFirstSaleCard", tag: "RevenueDot AI", summary: "Hide the first-sale card on the Overview", source: AI, parameters: [project],
      description: "Hides it for everyone in the project, so admins and developers only.",
      responses: { 200: ok("Hidden.", obj({ object: en(["first_sale"]), dismissed: bool() })), ...E(404) } }),
  },
  "/share/first-sale/{token}": {
    get: op({ id: "shareFirstSale", tag: "Share cards", summary: "Public first-sale page or image", security: NONE, source: "routes/share.ts", extension: true,
      parameters: [{ name: "token", in: "path", required: true, schema: str("The card's token; add `.svg` for the 1200×630 image.") }],
      responses: { 200: { description: "An HTML page with Open Graph tags, or the SVG card.", content: { "text/html": { schema: str() }, "image/svg+xml": { schema: str() } } }, 404: { description: "Unknown card." } } }),
  },
};
