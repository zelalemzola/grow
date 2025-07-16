# Outbrain Amplify API – Full Integration Reference (Growevity)

This document guides the Cursor agent to integrate Outbrain’s Amplify API deeply and precisely to serve Growevity’s analytical and KPI-tracking needs.

> ✅ **Note:** The `OB-TOKEN-V1` is already stored in the `.env` file under the variable `OUTBRAIN_TOKEN`.

---

## ✅ Authentication

All requests **must** include the `OB-TOKEN-V1` header using the value from the `.env` file.

```ts
const token = process.env.OUTBRAIN_TOKEN;
const headers = { "OB-TOKEN-V1": token };
📘 Base URL
ruby
Copy
Edit
https://api.outbrain.com/amplify/v0.1/
🧠 Core API Entities and Integration Strategy
1. 🔍 Marketers
GET /marketers

Purpose: Get the list of advertiser accounts (marketers).

Required for scoping all other calls (campaigns, reports, budgets, conversions).

✅ Must be called first to obtain marketer IDs.

2. 📦 Campaigns
To get all campaigns, loop through all marketer IDs.

Endpoint:

bash
Copy
Edit
GET /marketers/{marketerId}/campaigns?includeArchived=true&extraFields=CampaignOptimization,Budget
Recommended integration:

Fetch /marketers

For each marketerId, call /campaigns

Merge results into a global allCampaigns[] list

Each campaign object contains:

id, name, status, startDate, endDate, budgetId, cpc, etc.

3. 💰 Budgets
GET /marketers/{marketerId}/budgets

Retrieve:

budgetId, amountSpent, amountRemaining, startDate, endDate

Join this to campaigns via budgetId to track budget usage.

4. 🌍 Geo Locations
GET /locations/search?term=your_search

Used to resolve location IDs (countries, regions) that may appear in reporting or targeting metadata.

Not mandatory but useful for filtering and map-based views.

5. 📈 Performance Reporting
This endpoint powers most of the dashboard metrics.

GET /report/marketers/{marketerId}/content

Query Parameters:

from, to — e.g. from=2025-07-01&to=2025-07-15

includeConversionDetails=true

conversionsByClickDate=true

Returns fields:

contentId, clicks, conversions, spend, sumValue, impressions, ctr, etc.

🔁 For full coverage:

Iterate over all marketerIds

Aggregate data per campaign or content

Use for KPIs like ROAS, CPA, revenue, profit, etc.

📊 KPI Calculation Logic
KPI	Formula	Source
Total Sales	sum(sumValue)	/report/marketers/.../content
Total Conversions	sum(conversions)	same
Total Spend	sum(spend)	same
ROAS	sumValue / spend	derived
AOV	sumValue / conversions	derived
Cost Per Customer	spend / conversions	derived
Total Profit	sumValue - (spend + COGS + OPEX + fees)	some fields internal
Profit Margin	profit / sumValue	derived
CTR	clicks / impressions	derived
Refund Rate	external	from CheckoutChamp
Lost Revenue (Refunds)	external	from CheckoutChamp

6. 🧮 Conversion Events
GET /marketers/{marketerId}/conversionEvents

Shows all post-click and post-view conversion goals set on Outbrain.

Use this to ensure matching between Outbrain-tracked conversions and backend-tracked ones.

Fields include:

eventType, conversionWindow, category, urlPattern, etc.

🛠 Implementation Flow (for Cursor)
Call /marketers → collect marketerIds[]

For each marketer:

Call /campaigns

Call /budgets

Call /report/marketers/.../content

Call /conversionEvents

Merge campaigns with budgets by budgetId

Aggregate reporting data by campaign/content

Map sumValue, conversions, and spend into calculated metrics

Visualize in:

Campaign-level dashboards

Platform-level summaries

Region filters if used

🔐 Security & Reliability
Rate limit: 10 req/min per marketer

Reporting delay: approx. 10–30 minutes

Token lifespan: 30 days

Tokens are stored in .env under OUTBRAIN_TOKEN

Do not expose token on frontend – use backend proxy if needed

