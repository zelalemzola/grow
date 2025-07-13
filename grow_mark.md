
# 📊 Build Accounting Automation Dashboard Web App

## 1. Project Overview
We need a **scalable**, **responsive**, multipage web dashboard (Next.js + TypeScript + Axios + shadcn UI) to visualize accounting data pulled from backend APIs:
- Daily profit summaries (orders, revenue, ad spend, COGS, fees, etc.)
- Historical reporting with filters and CSV export
- Visual charts: line, bar, pie

✅ Requirements:
- Clean, lightweight UI
- Intuitive UX, mobile/tablet/desktop
- Modular, maintainable codebase for future scaling

---

## 2. APIs & Expected Responses

### 🎯 Ad Spend APIs

#### 2.1 Outbrain Amplify
- **Auth**: Obtain token via Basic Auth ➝ use `OB-TOKEN-V1` header ([outbrain.com](https://www.outbrain.com/help/advertisers/amplify-api/?utm_source=chatgpt.com))
- **Sample endpoint**:  
  ```
  GET /amplify/v0.1/reports/marketers/{marketerId}/campaigns?from=YYYY-MM-DD&to=YYYY-MM-DD
  ```
- **Response sample** (from Outbrain Sheets integration):  
  ```json
  [
    {
      "campaignId": "12345",
      "campaignName": "Spring Sale",
      "startDate": "2025-06-01",
      "endDate": "2025-06-30",
      "impressions": 150000,
      "clicks": 5000,
      "spend": 1200.50,
      "conversions": 300,
      "currency": "USD"
    }
  ]
  ```

#### 2.2 Taboola Backstage
- **Auth**: OAuth2 ➝ Bearer token in `Authorization` header ([developers.taboola.com](https://developers.taboola.com/backstage-api/reference/authentication-basics?utm_source=chatgpt.com))
- **Endpoint example**:  
  ```
  GET /backstage/api/1.0/{accountId}/reports/campaign-summary/dimensions/day?start_date=2025-06-01&end_date=2025-06-30
  ```
- **Response structure**:
  ```json
  {
    "timezone": "EDT",
    "results": [
      {
        "date": "2025-06-15 00:00:00.0",
        "clicks": 103,
        "impressions": 15400,
        "spent": 720.75,
        "cpc": 0.07,
        "cpm": 46.8,
        "roas": 1.2,
        "ctr": 0.0067,
        "currency": "USD"
      }
    ],
    "recordCount": 30,
    "metadata": {}
  }
  ```

#### 2.3 AdUp
- Standard OAuth2 flow → return token → GET spend & performance records.
- Response (likely):
  ```json
  [
    {
      "campaign_id": "9876",
      "date": "2025-06-15",
      "spend": 450.00,
      "impressions": 100000,
      "clicks": 2500
    }
  ]
  ```

#### 2.4 Checkout Champ (OMS & Sales Data)
- **Auth**: Basic Auth or loginId/password
- **Endpoints**:
  - `GET /transactions/query`
  - `GET /order/import`
- **Sample Response**:
  ```json
  {
    "orderId": "ABC123",
    "date": "2025-06-15",
    "sku": "SKU001",
    "quantity": 2,
    "total": 49.98,
    "usdAmount": 49.98,
    "paymentMethod": "Stripe",
    "refund": 0.00,
    "chargeback": 0.00,
    "upsell": true
  }
  ```

---

## 3. Data Models & Calculations

### Entities & Fields:
- **Order**: `orderId`, `date`, `sku`, `quantity`, `total`, `paymentMethod`, `refund`, `chargeback`, `upsell`
- **AdSpendEntry**: `platform`, `campaignId`, `date`, `spend`, `clicks`, `impressions`, `cpc`, `cpm`, `currency`
- **SKUCost**: `sku`, `unitCogs`, `shippingCost`, `handlingFee`
- **FixedExpense**: `date`, `category`, `amount`
- **PaymentFee**: e.g., calculated as `% of total per order`

### KPI Calculations:
- `GrossRevenue = SUM(order.total)`
- `RefundTotal`, `ChargebackTotal`, `RefundRate`, `ChargebackRate`
- `NetRevenue = GrossRevenue – RefundTotal – ChargebackTotal`
- `COGS = SUM(unitCogs * quantity + shipping + handling)`
- `MarketingSpend = SUM(ad spend across platforms)`
- `Opex = SUM(fixed expenses)`
- `NetProfit = NetRevenue – COGS – MarketingSpend – Opex – PaymentFees`
- `ROAS = GrossRevenue / MarketingSpend`
- `CostPerCustomer = MarketingSpend / unique customers`
- `UpsellRate = # with upsell / total orders`
- `AOV = GrossRevenue / total orders`

---

## 4. UI & Pages

### Core Pages
1. **Dashboard (Daily Summary)**
   - Filters: date range, brand, SKU, ad-platform, country, payment-method
   - KPI cards and sparkline trends

2. **Historical Reports**
   - Table/grid of daily summaries
   - Filter + pagination + Export CSV

3. **SKU Breakdown**
   - Bar/pie charts for revenue, profit by SKU
   - Allow drilling by SKU

4. **Ad Platform Spend**
   - Pie chart: spend distribution across platforms

5. **Geographic Insights** *(creative add)*
   - Map or table sorted by country

6. **Order-level Details** *(creative add)*
   - List of orders with filter/export, clickable for refund/chargeback insights

---


## 5. API Integration & Data Flow
- Set up Axios instances with auth handlers
- Fetch adSpend and orders concurrently (`Promise.all`)
- Transform to normalized data matching models
- Perform KPI calculations server-side or in API layer
- Fetch additional pages on-demand (orders, sku breakdown)
- Use React Query or Zustand for state & cache

---

## 6. Design & Responsiveness
- Use shadcn components (cards, tables, filters)
- Use recharts for charts
- Minimalist, clean styling
- Fully responsive: mobile, tablet, desktop
- Use semantic HTML and ensure accessibility (aria labels, alt text)

---

## 7. Deliverables
1. Multi-page Next.js dashboard
2. Typed, modular API connectors
3. KPI logic with unit tests
4. Filters + export table
5. Charts & responsive layout
6. Map/Order detail pages

---

## 8. Next Steps
Cursor to scaffold:
- Data models & TS types
- API connectors with sample requests/responses
- UI pages: dashboard, history, breakdowns
- Calculation utilities
- Layout and routing
- CSV export support
- Responsive styling
- Add map & order-detail pages as described

⚠️ Deliver a **clean, scalable, responsive**, multi‑screen dashboard with intuitive UX and visual clarity, use intuitive colors while displaying data, pages should offer visualization options for users as well.

---

**Ready to produce the full code scaffold, UI logic, and API handlers. Let’s build it!**
