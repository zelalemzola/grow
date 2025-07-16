
# 📊 Accounting Dashboard API Data Mapping & Audit Prompt

This document outlines the precise API endpoints and strategies for retrieving or calculating the metrics required in the project across four integrated platforms: Amplify (Outbrain), Taboola, AdUp, and CheckoutChamp.

Use this as a prompt for auditing the current codebase and aligning it with the proper data sources and their supported structures.

---

## ✅ Metrics to Support Across All APIs

The system should retrieve or derive the following KPIs:
- Total Sales
- Total Profit
- Profit Margin
- ROAS
- Cost per Customer
- Total Marketing Spend
- Total COGS
- Total OPEX
- Total Payment Processing Fees
- Total Orders
- Upsell Take Rate
- AOV (Average Order Value)
- Refund/Chargeback Numbers & Rate
- Revenue Lost Due to Refunds & CBs

---

## 🔹 Amplify (Outbrain) API – [Docs](https://amplifyv01.docs.apiary.io/#)

| Metric | Endpoint | Notes |
|--------|----------|-------|
| Total Sales | `/reports/marketers/{marketerId}/content` | Use `revenue` metric |
| Total Profit | ✳️ Not direct | Compute: `Revenue - (COGS + OPEX + Fees + Refunds)` |
| Profit Margin | ✳️ Not direct | `Profit / Sales` |
| ROAS | `/reports/marketers/{marketerId}/content` | Use `revenue` and `spend` |
| Cost per Customer | `/reports/marketers/{marketerId}/content` | `spend / conversions` |
| Total Marketing Spend | `/reports/marketers/{marketerId}/content` | Use `spend` field |
| Total COGS | ✳️ Not exposed | Use internal logic |
| Total OPEX | ✳️ Not exposed | Use internal logic |
| Total Payment Processing Fees | ✳️ Not exposed | Use internal/payments API |
| Total Orders | `/reports/marketers/{marketerId}/content` | Use `conversions` |
| Upsell Take Rate | ✳️ Not exposed | Use campaign structure/tags |
| AOV | `/reports/marketers/{marketerId}/content` | Calculate: `Sales / Orders` |
| Refunds & CBs | ✳️ Not available | Use accounting systems |

---

## 🔹 Taboola API – [Docs](https://developers.taboola.com/backstage-api/reference/welcome)

| Metric | Endpoint | Notes |
|--------|----------|-------|
| Total Sales | `/campaigns/performance` | Use `revenue` metric |
| Total Profit | ✳️ Not direct | Compute from `revenue - spend - costs` |
| Profit Margin | ✳️ Not direct | Derived |
| ROAS | `/campaigns/performance` | Use `revenue / spent` |
| Cost per Customer | `/campaigns/performance` | Use `spent / conversions` |
| Total Marketing Spend | `/campaigns/performance` | Use `spent` |
| Total COGS/OPEX | ✳️ Not provided | Use internal logic |
| Payment Fees | ✳️ Not provided | Payment system needed |
| Total Orders | `/campaigns/performance` | Use `conversions` |
| Upsell Take Rate | ✳️ Not exposed | May need CRM |
| AOV | Derived | `revenue / conversions` |
| Refunds & CBs | ✳️ Not available | Use payment/accounting system |

---

## 🔹 AdUp API – [Docs](https://www.adup-tech.com/en/support/article/adup-api-basics/)

| Metric | Endpoint | Notes |
|--------|----------|-------|
| Total Sales | `CAMPAIGN_PERFORMANCE_REPORT` | Use `revenue` |
| Total Profit | ✳️ Not direct | Derived from other metrics |
| Profit Margin | ✳️ Not direct | Calculate manually |
| ROAS | `CAMPAIGN_PERFORMANCE_REPORT` | Use `revenue / spend` |
| Cost per Customer | `CAMPAIGN_PERFORMANCE_REPORT` | Use `spend / conversions` |
| Total Marketing Spend | `CAMPAIGN_PERFORMANCE_REPORT` | Aggregate `spend` |
| COGS, OPEX, Fees | ✳️ Not available | Use financial systems |
| Orders | `CAMPAIGN_PERFORMANCE_REPORT` | Use `conversions` |
| AOV | Derived | `revenue / orders` |
| Upsell & Refunds | ✳️ Not available | Tagging/CRM needed |

---

## 🔹 CheckoutChamp API – [Docs](https://apidocs.checkoutchamp.com/)

| Metric | Endpoint | Notes |
|--------|----------|-------|
| Total Sales | `/order/query` | Sum `order_total` |
| Total Profit | ✳️ Not direct | Derived from sales - costs |
| Profit Margin | ✳️ Not direct | Profit / Sales |
| ROAS | ✳️ Not available | Combine with ad platform spend |
| Cost per Customer | ✳️ Not available | Combine ad spend with order data |
| Total Orders | `/order/query` | Count orders |
| AOV | Derived | `sales / orders` |
| Refunds, CBs, Fees | ✳️ Not provided | Use Stripe/Checkout.com APIs |
| Upsell Take Rate | ✳️ Not available | Custom tagging in metadata |

---

## 🧪 Prompt Objective

Use this audit prompt to:

1. Validate that all metric visualizations and tables pull from the correct API or calculate the metric accurately.
2. Ensure all API integrations follow authentication standards (`OB-TOKEN-V1` for Amplify, OAuth2 for AdUp, etc.).
3. Verify that charts rendering ROAS, sales, orders, etc., have correctly mapped fields per API.
4. Where APIs do not expose data (COGS, Fees, OPEX, Refunds), fallback logic must be implemented using static fields.
5. Each API client wrapper should map the above endpoints with proper pagination, filters (date, campaign), and headers.

---

## 📌 Final Note

This project integrates multiple APIs with inconsistent financial data support. Your app must gracefully handle missing metrics by:

- Tagging uncalculable KPIs with visual warnings
- Using fallback values
- Explaining metrics sourced via combination or inference
