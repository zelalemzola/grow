# COGS SKU Missing Analysis Report

## Issue Summary
The client has reported that not all SKUs are being displayed on the COGS calculations page, particularly when products have upsells.

## Root Cause Analysis

### 1. **SKU Processing Logic Issues**

#### Problem 1: SKU Filtering and Validation
In `src/lib/cogsStore.ts`, the `aggregateProductsFromOrders` function has strict filtering:

```typescript
const sku = (item.productSku || '').trim().toUpperCase();
if (!sku) continue; // This skips items with empty/null SKUs
```

**Potential Issues:**
- Items with missing `productSku` field are completely ignored
- Items with whitespace-only SKUs are filtered out
- Case sensitivity issues before normalization

#### Problem 2: Upsell Item Processing
In `src/lib/api.ts`, the CheckoutChamp order processing creates a combined SKU string:

```typescript
sku = itemsArr.map((item: any) => item.productSku).filter(Boolean).join(', ');
```

**Issues:**
- This creates comma-separated SKU strings instead of individual SKU entries
- Individual upsell items lose their separate identity
- The COGS calculation treats "SKU1, SKU2" as a single product instead of two separate products

#### Problem 3: Items Structure Inconsistency
The order items are processed as `Object.values(order.items)`, but the structure might be inconsistent:
- Some orders might have `items` as an array
- Some might have `items` as an object with numeric keys
- Some might have nested structures

### 2. **Data Aggregation Issues**

#### Problem 4: Quantity Calculation
```typescript
map[sku].qty += Number(item.qty) || 1;
```
- If `item.qty` is undefined, it defaults to 1, which might not be accurate
- Multiple items with the same SKU get aggregated, potentially losing individual upsell tracking

#### Problem 5: Missing Product Types
The system doesn't differentiate between:
- Main products
- Upsell products  
- Cross-sell products
- Bundles

### 3. **Database and API Issues**

#### Problem 6: SKU Normalization Inconsistency
- Database stores SKUs in uppercase (`uppercase: true` in schema)
- But the processing might not consistently normalize all SKUs
- Mixed case SKUs from different sources might create duplicates

#### Problem 7: Async Data Loading Race Conditions
The client component has complex async data loading that might cause timing issues:
- Orders load first
- COGS products load separately
- Background calculation runs independently
- Race conditions might cause some products to be missed

## Specific Issues Found

### 1. **Upsell Items Not Properly Separated**
Current code in `fetchCheckoutChampOrders`:
```typescript
sku = itemsArr.map((item: any) => item.productSku).filter(Boolean).join(', ');
```

This should create separate entries for each SKU instead of joining them.

### 2. **Missing Error Handling**
No error handling for malformed item data:
- Missing `productSku` field
- Invalid quantity values
- Corrupted order data

### 3. **Incomplete Product Information**
The system doesn't capture:
- Product variants
- Bundle components
- Subscription vs one-time products

## Recommended Fixes

### Fix 1: Improve SKU Processing
```typescript
// Instead of joining SKUs, process each item separately
for (const item of Object.values(order.items) as any[]) {
  const sku = (item.productSku || '').trim().toUpperCase();
  if (!sku) {
    console.warn('Missing SKU for item:', item);
    continue;
  }
  
  // Process each SKU individually
  if (!map[sku]) {
    map[sku] = {
      sku,
      name: item.name || item.productName || sku,
      price: Number(item.price) || 0,
      productCost: 0,
      qty: 0,
      isUpsell: item.productType === 'UPSALE',
      orderId: order.orderId // For debugging
    };
  }
  map[sku].qty += Number(item.qty) || 1;
}
```

### Fix 2: Add Comprehensive Logging
```typescript
console.log('Processing order:', {
  orderId: order.orderId,
  itemCount: Object.keys(order.items || {}).length,
  skus: Object.values(order.items || {}).map(item => item.productSku)
});
```

### Fix 3: Handle Edge Cases
- Empty or null items
- Malformed quantity values
- Missing product information
- Duplicate SKUs with different cases

### Fix 4: Improve Data Validation
Add validation for:
- Required fields (SKU, quantity)
- Data types
- Value ranges

## Testing Recommendations

1. **Check Raw Order Data**
   - Examine actual CheckoutChamp API responses
   - Verify item structure consistency
   - Check for missing fields

2. **SKU Audit**
   - Compare displayed SKUs with database records
   - Check for case sensitivity issues
   - Verify upsell items are properly separated

3. **Quantity Verification**
   - Ensure quantities are correctly aggregated
   - Check for missing or zero quantities

4. **Error Monitoring**
   - Add comprehensive logging
   - Monitor for processing errors
   - Track skipped items

## Implementation Priority

1. **High Priority**: Fix upsell SKU separation
2. **High Priority**: Add comprehensive logging
3. **Medium Priority**: Improve error handling
4. **Medium Priority**: Add data validation
5. **Low Priority**: Enhance product type tracking

## Next Steps

1. Implement the SKU processing fixes
2. Add detailed logging to identify missing items
3. Test with real order data
4. Monitor for improvements in SKU coverage
5. Create alerts for data quality issues
