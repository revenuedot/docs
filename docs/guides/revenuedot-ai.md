---
title: How do I ask RevenueDot AI about my revenue and customers?
description: RevenueDot AI is the assistant in the dashboard. It answers from your own metrics, charts, customers and catalog, and changes things only after you approve each change. Admins choose read and write, read only, or off.
---

# How do I ask RevenueDot AI about my revenue and customers?

**RevenueDot AI answers questions with your own numbers and makes small changes after you approve them.** Open it from the sparkle in the top bar, or type a question into the **Ask about insights or growth opportunities** bar on the Overview.

Every answer comes from tools that read your project through the same API the dashboard uses. Every change shows an **Approve** and **Deny** card first, and approved changes are written to the audit log as "RevenueDot AI on behalf of" you.

## Ask a question
1. Open **RevenueDot AI** (`/projects/<project>/ai`). The page greets you by name.
2. Type a question and press **Enter**. For example:
   - "How is revenue doing this month?"
   - "Which offering converts trials best over the last 90 days?"
   - "Why did customer wren@example.com lose access?"
   - "Are any webhooks failing?"
   - "Which variant of my price test is winning?"
3. Each tool the assistant runs shows as a card (for example **Revenue metrics** or **Chart · trial conversion rate**). Open a card to see what it asked for and what came back.
4. Links in the answer open the chart, customer or page the number comes from.

Your conversations are listed on the left. Search them, start a **New conversation**, or use the **⋯** menu to rename or delete one. A conversation belongs to you; other members of the project do not see it.

### Attach a screenshot
Select **Attach image** (or drop a file on the box) to add a PNG, JPEG, WebP or GIF up to 5 MB, four per message. The assistant reads it with the question: a screenshot of an error, an App Store Connect page, or a customer's receipt.

### Mention a customer, offering or chart
Type `@` and pick from the list: customers (by app user ID), offerings and charts. The assistant gets that item's details with your question, so "Why did @wren_ios cancel?" needs no lookup.

### Import products from a StoreKit configuration file
Attach the `.storekit` file Xcode uses for local StoreKit testing. The chat shows its products (IDs, types, prices, periods, introductory offers). Select **Import into catalog** and approve: RevenueDot creates the products on your App Store app and skips the ones that already exist. Prices and offers stay in App Store Connect.

## Approve or deny a change
These tools change your project. Each one stops and asks first:

| Tool | What it changes |
|---|---|
| Grant entitlement | Gives a customer promotional access until a date, for example "Grant pro to wjqx8kd2rn1 for 7 days" |
| Revoke entitlement | Ends promotional access that was granted |
| Create product | Adds a product to an app |
| Attach products to entitlement / package | Makes products unlock an entitlement, or puts them in a package |
| Set current offering | Changes the offering apps show by default |
| Create experiment draft | Saves a draft experiment: a control offering, 1 to 3 treatment offerings, its type, metrics, hypothesis and audience. Nobody joins until you start it ([Experiments](experiments.md#create-an-experiment-with-revenuedot-ai)) |
| Start experiment / Pause experiment / Stop experiment | Starts or resumes an experiment, pauses it, or stops it for good |
| Create targeting rule | Adds a targeting rule that gives an audience an offering and placement offerings, optionally between two dates. It is created turned off ([Targeting](targeting-and-experiments.md#create-a-rule)) |
| Retry webhook delivery / Replay failed deliveries | Sends failed webhook deliveries again |
| Import StoreKit products | Creates products from an attached `.storekit` file |

The card says what will change and lists every value the change will use. **Approve** runs it once and shows the result; **Deny** changes nothing and the assistant says so. Approving the same card again, or from a second tab, does not repeat the change. RevenueDot AI cannot create API keys, webhooks, apps or store credentials, cannot delete customers, and never reads or shows secrets.

Customer attributes, product names and attached files are data the assistant reads, and anyone who can write them could put instructions in them. The approval card is what stops such text from changing your project: nothing changes until you approve. Answers never load images, so a reply cannot send your data to another site without a click.

## Choose what the assistant may do
Admins open **Project settings > AI features** and pick one:

| Setting | Effect |
|---|---|
| **Read and write with permission** (default) | Reads everything the person's role can read; changes ask for approval first |
| **Read only** | Answers questions; offers no change tools |
| **Disabled** | Nobody in the project can use RevenueDot AI; conversations are kept |

A person's role limits it further: a **Viewer** can only read, whatever the setting. Developers and Admins can approve changes their role allows.

## Limits
- Each person can ask 20 questions a minute and 200 a day. A project gets 600 a day. Token caps sit behind those (2 million per person and 6 million per project a day).
- The day resets at midnight UTC. Today's usage is on the **AI features** tab.
- One answer runs at most 8 model steps, and stops early once a token cap is used up.
- You can attach 60 files an hour.

## Weekly growth insights
Under the Ask bar, the Overview shows 3 to 5 recommendations RevenueDot AI writes each week from your charts, campaigns and benchmarks, with the numbers behind each one, and admins get them by email. They only read. See [Growth insights](growth-insights.md).

Two read tools help with growth questions: **get-attribution-report** (new customers and revenue by media source, campaign, ad group or keyword; see [Attribution](attribution.md)) and **get-benchmarks** (your metrics against similar apps on RevenueDot Cloud; see [Benchmarks](benchmarks.md)). **get-chart** also segments by the attribution dimensions.

## The first-sale card
When your project's first paid production purchase arrives, the Overview shows **First sale** with the price and product. **Share** copies a public link to a card made for social posts (`/share/first-sale/<token>`, with a 1200×630 image). The card shows your project name, the product, price, store, country and date, and nothing about the customer. Admins and developers can dismiss it for the project when you are done.

## Self-hosting
RevenueDot AI is off until the server has a model. Set one of these in `.env` and restart:

| Variable | Model used |
|---|---|
| `ANTHROPIC_API_KEY` | Claude Opus 5.5 (`claude-opus-5-5`) |
| `OPENAI_API_KEY` | GPT-6 Astra (`gpt-6-astra`); `OPENAI_BASE_URL` for a compatible gateway |
| `REVENUEDOT_ASSISTANT_MODEL` | Optional: another model id from the same provider |
| `REVENUEDOT_ASSISTANT_CAPS` | Optional JSON caps, for example `{"userTurnsPerDay": 500}` |

Approval cards are signed with `REVENUEDOT_ENCRYPTION_KEY` (or the signing key) when one is set. Conversations and their answers are stored in your Postgres. If you reload while an answer is being written, the page picks it up where it was. If the server restarts mid-answer, the conversation says the answer was interrupted and offers **Retry**.

On RevenueDot Cloud the assistant runs on Workers AI (Kimi K2.6), and each conversation lives in its own Cloudflare Durable Object, so answers survive reloads and deploys.

## The API
Everything the page does is in the [API reference](../../api/extensions.md) under **RevenueDot AI**: `GET /v2/projects/{project_id}/ai` (status), conversations, `POST …/chat` (an AI SDK UI message stream over Server-Sent Events), `GET …/stream` (resume), files, mentions and the AI setting. To use RevenueDot from ChatGPT, Claude or Cursor instead, see [Connect AI assistants](connect-ai-assistants.md); those tools have the same names.
