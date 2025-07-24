import { connectDB } from '@/lib/config/db';
import { COGSProduct } from '@/lib/models/COGSProduct';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LoadDB = async () => {
  await connectDB();
};
LoadDB();

export async function GET(request: NextRequest) {
  const products = await COGSProduct.find({});
  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const { sku, productCost, name } = await request.json();
  if (!sku || typeof productCost !== 'number') {
    return NextResponse.json({ error: 'sku and productCost required' }, { status: 400 });
  }
  await COGSProduct.updateOne(
    { sku: sku.toUpperCase() },
    { $set: { productCost, ...(name ? { name } : {}) } },
    { upsert: true }
  );
  const products = await COGSProduct.find({});
  return NextResponse.json(products);
} 