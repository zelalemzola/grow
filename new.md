
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
