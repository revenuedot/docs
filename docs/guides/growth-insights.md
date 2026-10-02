---
title: Growth insights
description: Every week RevenueDot AI reads your charts, campaigns and benchmarks and suggests 3 to 5 things to act on, with the numbers behind each one, on the Overview and in an email digest to admins.
---

# Growth insights

**Growth insights are 3 to 5 weekly recommendations from RevenueDot AI, each backed by your own numbers.** They appear on the **Overview** under the "Ask about insights or growth opportunities" bar, and admins get them by email every Monday.

## What you see
Each insight has:
- a title and what changed or how you compare ("Trial conversion fell to 31.2%, against 38.0% the 28 days before");
- the numbers it rests on, as chips with the change: these come from RevenueDot's own calculation, not from the model's text;
- one thing to do this week, such as an experiment on trial length, moving ad budget to a campaign with higher revenue per customer, a win-back campaign or Refund Control;
- **Open** to go to the chart, the attribution report or the benchmarks it comes from, and **Ask about this** to continue in a [RevenueDot AI](revenuedot-ai.md) conversation.

## How they are written
1. RevenueDot computes a data pack from your production data with the chart definitions: MRR and active subscriptions now against 28 days ago; revenue, new customers and new trials in the last 28 days against the 28 before; trial conversion, initial conversion and conversion to paying for cohorts old enough to have finished; churn; refund rate; the top campaigns by revenue (see [Attribution](attribution.md)); and, if your project shares them, your [Benchmarks](benchmarks.md).
2. RevenueDot AI reads the pack and may look closer with its read tools (charts, the attribution report, benchmarks).
3. The server keeps only recommendations that cite items of the pack, attaches the real numbers and links, and needs 3 to 5 of them; otherwise it asks the model once more.

Growth insights only read. The assistant gets no tool that changes anything, and RevenueDot refuses any change from it, whatever the project's AI setting.

## When they are written
- **Weekly:** from Monday 06:00 UTC, for every project with production revenue in the last 90 days and RevenueDot AI not turned off. The week's insights stay until the next Monday.
- **On demand:** admins and developers can select **Write insights** or **Refresh** on the Overview, at most once an hour. It counts as one question against your daily RevenueDot AI allowance.

Opening the Overview never calls the model: it shows the week's saved insights.

## The weekly email
Admins of a project get the week's insights by email, with links to each chart. The email has no customer IDs or emails. To stop it:
- turn off **Email me weekly** on the Overview, or **Email me the weekly growth insights digest** in **Account settings**; or
- use **Stop the weekly digest** in any digest email (one click, also from your mail app's unsubscribe button).

Turn it back on in Account settings.

## Self-hosting
On a self-hosted server the Overview panel works with any model key ([RevenueDot AI](revenuedot-ai.md#self-hosting)). The weekly run and email spend your model key, so they are off unless you set:

```bash
REVENUEDOT_INSIGHTS_DIGEST=on
```

Benchmarks are a RevenueDot Cloud feature, so self-hosted insights do not mention peers.

## Use the API
- `GET /v2/projects/{project_id}/ai/insights`: this week's insights (or the last ready week's) with their numbers.
- `POST /v2/projects/{project_id}/ai/insights/refresh`: write them now (dashboard session; admins and developers).
- `POST /auth/me` with `{"insights_emails": false}`: stop the digest for the signed-in user.

See the [API reference](../../api/extensions.md#growth-insights).
