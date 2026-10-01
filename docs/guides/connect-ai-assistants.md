---
title: Connect ChatGPT, Claude and other AI assistants
description: Connect RevenueDot to ChatGPT, Claude, Cursor or Claude Code with OAuth, choose what the assistant may do, and run setup, support and health checks from chat.
---

# Connect ChatGPT, Claude and other AI assistants

RevenueDot has one connector for every assistant: `https://mcp.revenuedot.app/mcp`. It has 34 tools to set up your catalog, find customers, grant or extend access, cancel or refund, add and debug webhooks, check your store connections and read revenue. The same server is the RevenueDot plugin for ChatGPT and Codex and the RevenueDot connector for Claude.

## Connect

| Assistant | Steps |
|---|---|
| Claude (claude.ai, Desktop, mobile) | Add a custom connector in Connectors settings and paste `https://mcp.revenuedot.app/mcp`. In Claude Code you can also install the plugin: `/plugin marketplace add revenuedot/agent-skills`, then `/plugin install revenuedot@revenuedot` |
| Claude Code | `claude mcp add --transport http revenuedot https://mcp.revenuedot.app/mcp`, then `/mcp` to sign in |
| ChatGPT | Turn on developer mode in ChatGPT's settings, add an MCP connector with `https://mcp.revenuedot.app/mcp` and choose OAuth. After the directory listing is approved you can also search for RevenueDot |
| Codex | `codex plugin marketplace add revenuedot/agent-skills`, then install `revenuedot` |
| Cursor and others | Add an MCP server of type streamable HTTP with the same URL |

The assistant opens a RevenueDot page where you sign in with your dashboard account, pick **one project**, and choose what it may do:

| Choice | The assistant can |
|---|---|
| **Read only** | Read the catalog, customers, events, transactions, webhooks and metrics |
| **Read and change** | Also create products, entitlements and offerings, grant and revoke access, set customer attributes, manage webhooks, delete a customer |
| **Money actions** (a separate checkbox) | Also extend, cancel and refund subscriptions and make Test Store purchases |

A first connection asks for read and change only. When you ask for a refund, the assistant tells you it needs the Money actions permission and asks you to approve it.

## What to ask

- "Set up monthly and annual Pro plans for my iOS and Android apps behind a `pro` entitlement."
- "Find the customer with email jane@example.com. Why don't they have access?"
- "Give user_42 Pro for 7 days."
- "Is everything connected? Did any webhook fail this week?"
- "What is my MRR and how did it change in 28 days?"

## Safety

- The assistant never needs, and no tool accepts, a store key, a password or an API key. Add those in the dashboard.
- The assistant asks you before it cancels, refunds or deletes. Check the customer and product it names.
- Cancel and refund work for Google Play subscriptions. Apple does not allow a server to refund or cancel: send the customer to https://reportaproblem.apple.com or extend their subscription.
- The connection is a secret API key named `OAuth: <app name>` limited to the project and the access you chose. Delete it under **API keys** in the dashboard to disconnect. It does not expire.

## Use your own key instead of OAuth

Send `Authorization: Bearer sk_...` with a secret key from **API keys**. Give the key only the permissions you want the assistant to have; a read-only key cannot change anything. For a self-hosted server, run `npx -y @revenuedot/mcp --http --url https://your-server`; see the [MCP server README](https://github.com/revenuedot/mcp#connect).

## Related

- [Webhooks](webhooks.md)
- [Going to production](going-to-production.md)
- [Skills for coding agents](https://github.com/revenuedot/agent-skills)
