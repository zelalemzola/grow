# 📊 Accounting Automation Dashboard

A comprehensive, responsive web dashboard for visualizing accounting data from multiple advertising platforms and sales channels. Built with Next.js, TypeScript, and modern UI components.

## 🚀 Features

### Core Functionality
- **Multi-Platform Integration**: Seamlessly connects to Outbrain Amplify, Taboola Backstage, AdUp, and Checkout Champ
- **Real-time KPI Tracking**: Monitor ROAS, AOV, profit margins, and customer acquisition costs
- **Automated Calculations**: Net profit, COGS, marketing spend, and operational expenses
- **Visual Analytics**: Beautiful charts and graphs using Recharts
- **Responsive Design**: Optimized for mobile, tablet, and desktop

### Key Metrics
- **Revenue Metrics**: Gross revenue, net revenue, refunds, chargebacks
- **Profitability**: Net profit, COGS, marketing spend, OPEX
- **Performance KPIs**: ROAS, AOV, upsell rate, cost per customer
- **Geographic Insights**: Revenue by country and region
- **SKU Analysis**: Product performance breakdown

### Data Visualization
- **Line Charts**: Revenue trends over time
- **Pie Charts**: Platform spend distribution
- **Bar Charts**: SKU performance comparison
- **Geographic Maps**: Country-wise performance
- **Interactive Tables**: Detailed order and transaction data

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **HTTP Client**: Axios for API calls
- **Date Handling**: date-fns

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- API credentials for:
  - Outbrain Amplify
  - Taboola Backstage
  - AdUp
  - Checkout Champ

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd grow
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Outbrain Amplify
OUTBRAIN_TOKEN=your_token_here  # Generate from Outbrain dashboard, keep secret

# Taboola Backstage
TABOOLA_CLIENT_ID=your_client_id
TABOOLA_CLIENT_SECRET=your_client_secret
TABOOLA_ACCOUNT_ID=your_account_id

# AdUp
ADUP_CLIENT_ID=your_client_id
ADUP_CLIENT_SECRET=your_client_secret

# Checkout Champ
CHECKOUT_CHAMP_USERNAME=your_username
CHECKOUT_CHAMP_PASSWORD=your_password
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📊 API Integrations

### Outbrain Amplify
- **Authentication**: Basic Auth with `OB-TOKEN-V1` header
- **Endpoint**: `/amplify/v0.1/reports/marketers/{marketerId}/campaigns`
- **Data**: Campaign performance, spend, impressions, clicks

### Taboola Backstage
- **Authentication**: OAuth2 Bearer token
- **Endpoint**: `/backstage/api/1.0/{accountId}/reports/campaign-summary/dimensions/day`
- **Data**: Daily campaign metrics, CPC, CPM, ROAS

### AdUp
- **Authentication**: OAuth2 client credentials
- **Endpoint**: `/reports/spend`
- **Data**: Campaign spend and performance metrics

### Checkout Champ
- **Authentication**: Basic Auth
- **Endpoint**: `/transactions/query`
- **Data**: Order details, revenue, refunds, chargebacks

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── dashboard/         # Dashboard pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── dashboard/         # Dashboard-specific components
│   ├── layout/            # Layout components
│   └── ui/               # shadcn/ui components
└── lib/                  # Utilities and business logic
    ├── api.ts            # API integration functions
    ├── calculations.ts   # KPI calculation logic
    ├── types.ts          # TypeScript type definitions
    └── utils.ts          # Utility functions
```

## 📈 KPI Calculations

### Revenue Metrics
- **Gross Revenue**: `SUM(order.total)`
- **Net Revenue**: `Gross Revenue - Refunds - Chargebacks`
- **Refund Rate**: `(Refund Total / Gross Revenue) * 100`
- **Chargeback Rate**: `(Chargeback Total / Gross Revenue) * 100`

### Profitability Metrics
- **COGS**: `SUM(unitCogs * quantity + shipping + handling)`
- **Net Profit**: `Net Revenue - COGS - Marketing Spend - OPEX - Payment Fees`
- **ROAS**: `Gross Revenue / Marketing Spend`
- **AOV**: `Gross Revenue / Total Orders`

### Customer Metrics
- **Cost per Customer**: `Marketing Spend / Unique Customers`
- **Upsell Rate**: `(Orders with Upsells / Total Orders) * 100`

## 🎨 UI Components

### KPI Cards
- Display key metrics with trend indicators
- Support currency, percentage, and number formatting
- Responsive grid layout

### Charts
- **RevenueChart**: Line chart for revenue trends
- **PieChart**: Platform spend distribution
- **BarChart**: SKU performance comparison
- **GeographicChart**: Country-wise performance

### Data Tables
- Sortable and filterable order data
- Export functionality to CSV
- Pagination support

## 🔧 Configuration

### API Configuration
Update `src/lib/api.ts` to modify API endpoints and authentication methods.

### Styling
- Uses Tailwind CSS with shadcn/ui components
- Customizable theme through CSS variables
- Responsive breakpoints for mobile/tablet/desktop

### Environment Variables
All API credentials are stored in environment variables for security.

## 📱 Responsive Design

The dashboard is fully responsive with:
- **Mobile**: Single column layout, collapsible navigation
- **Tablet**: Two-column grid for charts
- **Desktop**: Full multi-column layout with sidebar navigation

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
- **Netlify**: Configure build command and output directory
- **AWS Amplify**: Connect repository and configure build settings
- **Docker**: Use provided Dockerfile for containerized deployment

## 🔒 Security

- API credentials stored in environment variables
- HTTPS enforced in production
- Input validation and sanitization
- Error handling for API failures

## 📝 Development

### Adding New APIs
1. Add API configuration to `src/lib/api.ts`
2. Create TypeScript interfaces in `src/lib/types.ts`
3. Implement data transformation functions
4. Update KPI calculations if needed

### Adding New Charts
1. Create chart component in `src/components/dashboard/`
2. Use Recharts library for visualization
3. Add to dashboard page as needed

### Styling
- Use Tailwind CSS classes
- Follow shadcn/ui component patterns
- Maintain responsive design principles

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in `/docs`
- Review API documentation for each platform

---

**Built with ❤️ using Next.js, TypeScript, and modern web technologies**

# Setup: Checkout Champ Credentials

To enable the Checkout Champ integration, you must set the following environment variables in a `.env.local` file at the root of your project:

```
CHECKOUT_CHAMP_USERNAME=Api-for-wa
CHECKOUT_CHAMP_PASSWORD=api123api123api
```

- These credentials are required for the backend to authenticate with the Checkout Champ API.
- If your server is not whitelisted, you may receive an error from the API (e.g., `IP must be whitelisted`).
- Make sure to restart your dev server after adding or changing environment variables.

---
