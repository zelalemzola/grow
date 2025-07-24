import { connectDB } from '@/lib/config/db';
import { PaymentFee } from '@/lib/models/PaymentFee';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LoadDB = async () => {
  await connectDB();
};
LoadDB();

export async function GET(request: NextRequest) {
  // Ensure defaults directly in the handler
  await PaymentFee.updateOne(
    { paySource: 'creditcard' },
    { $setOnInsert: { paySource: 'creditcard', percentage: 3 } },
    { upsert: true }
  );
  await PaymentFee.updateOne(
    { paySource: 'paypal' },
    { $setOnInsert: { paySource: 'paypal', percentage: 9 } },
    { upsert: true }
  );
  const fees = await PaymentFee.find({});
  return NextResponse.json(fees);
}

export async function POST(request: NextRequest) {
  const { paySource, percentage } = await request.json();
  if (!paySource || typeof percentage !== 'number') {
    return NextResponse.json({ error: 'paySource and percentage required' }, { status: 400 });
  }
  await PaymentFee.updateOne(
    { paySource: paySource.toLowerCase() },
    { $set: { percentage } },
    { upsert: true }
  );
  const fees = await PaymentFee.find({});
  return NextResponse.json(fees);
} 