# ✨ Cursor Prompt – Redesign and Polish Growevity Analytics Platform

## 🎯 Objective
Redesign **the entire analytics platform** from scratch based on the logic and API data structures learned from the following pages:

- `/platforms/taboola`
- `/platforms/outbrains`
- `/platforms/adup`
- `/platforms/checkoutchamp`

These pages serve as *learning references only*. Do **not** redesign these specific pages. Instead, **use the knowledge from them** to redesign **all other pages** in the project to align with the client’s original vision and data expectations.

## 📌 Core Guidelines and Expectations

### 1. ✅ **Use React Query** for All Data Fetching
- Maintain the same React Query-based architecture for all API interactions across every page.
- Ensure query caching, loading states, error handling, and background updates are handled cleanly using `useQuery` and `useMutation`.

---

### 2. 🎨 **UI Design System – Use `shadcn/ui` Exclusively**
All components MUST be implemented using `shadcn/ui`. This includes:
- Selects
- Inputs
- Tables
- Dialogs/Modals
- Calendars
- Tooltips
- Switches
- Sheets/Drawers
- Tabs
- Alerts, Toasts, Skeletons, and Progress Indicators

No third-party component libraries or raw HTML structures should be used. Follow a clean and modern layout using TailwindCSS + `shadcn`.

---

### 3. ⚙️ **Data Presentation per Platform**
Understand that:
- Each platform may return **different fields and structures**
- Some platforms (like Outbrain) may return `sumValue`, `conversions`, `revenue`, `spend`
- Others (like CheckoutChamp) may provide detailed order-level data

Please:
- Display all meaningful attributes from each API
- Handle and **gracefully render missing/undefined attributes**
- Use dynamic table columns when needed, depending on platform-specific responses
- For unknown fields, either calculate them or label clearly (e.g., “Not available on this platform”)

---

### 4. 📊 **Calculation & Visualizations**
Where possible, calculate:
- ROAS
- AOV
- Cost per Customer
- Total Spend
- Total Orders
- Profit and Profit Margin
- Refund Rates and Revenue Lost
- Platform Comparison Metrics

Display via:
- Cards
- Trend Charts (Line/Bar)
- Tabular reports
- Interactive Filters (brand, SKU, platform, date, payment method, etc.)

---

### 5. 💡 **Visual & Functional Improvements**
All redesigned pages must:
- Be **responsive** across mobile, tablet, and desktop using best practices
- Use **drawers** for mobile nav (not fixed sidebars)
- Adapt content width when sidebar is collapsed or expanded
- Allow:
  - **Custom filters** (date range, brand, SKU, ad platform, country, etc.)
  - **Adjustable visible columns** in every table
  - **Modal detail views** when clicking KPI cards
  - **Custom calculation widgets** where applicable

---

### 6. 🧠 Business Logic Awareness
Use knowledge from current `/platforms/*` pages to learn:
- How API responses are fetched, parsed, and transformed
- The best way to visualize unique or nested attributes
- How Outbrain, Taboola, and AdUp differ in their campaign data models
- The CheckoutChamp `/order/query` endpoint and how it drives revenue/order views

---

### 7. 📂 Pages to Redesign
Redesign **all other pages** (except `/platforms/outbrains`, `/platforms/taboola`, `/platforms/adup`, and `/platforms/checkoutchamp`) using the logic and structure learned from the platforms above.

Optional Additions:
```
/platforms-comparison
/platforms-insights
```

Each should:
- Include charts, tables, and KPIs
- Highlight unique platform insights
- Provide exportable or drill-down data

---

### 8. 🗂️ Data Aggregation Strategy
Wherever “All Campaigns” or “All Data” is needed:
- Loop through all marketers/accounts (as done for Outbrain)
- Aggregate across those scopes
- Ensure performant loading via pagination or chunked queries

---

## 🧩 Reminders

- `OB-TOKEN-V1` (Outbrain) is stored in `.env` as `OUTBRAIN_TOKEN`
- All API tokens must be abstracted via environment variables
- All API logic must remain secure – **never expose tokens client-side**
- Where an attribute is unavailable on a platform, display “N/A” or greyed out, not blank or broken

---

## ✅ Deliverables Checklist

| Requirement                             | Status      |
|----------------------------------------|-------------|
| React Query used across all APIs       | Must be ✅  |
| `shadcn` components only               | Must be ✅  |
| Charts, tables, filters on all pages   | Must be ✅  |
| Responsive and mobile-first design     | Must be ✅  |
| Custom modals, filters, widgets        | Must be ✅  |
| Attributes matched to client KPIs      | Must be ✅  |
| Calculations derived where needed      | Must be ✅  |

---

## 📎 Attached Reference
Be sure to refer to the attached:
- `Growevity_Project_Description.md` → for client’s original vision and features
- `/platforms/*` pages → for existing data-fetching & logic examples

---

> Please rebuild with an elevated structure, visuals, and calculations — while staying grounded in the original purpose of this internal analytics platform.

Generated: 2025-07-18
