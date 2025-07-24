import { connectDB } from '@/lib/config/db';
import { Opex } from '@/lib/models/Opex';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
export async function GET(request: NextRequest) {
  await connectDB(); // ✅ Move inside
  let opex = await Opex.findOne();
  if (!opex) opex = await Opex.create({ value: 3000 });
  return NextResponse.json({ value: opex.value });
}

export async function POST(request: NextRequest) {
  await connectDB(); // ✅ Move inside
  const { value } = await request.json();
  if (typeof value !== 'number') {
    return NextResponse.json({ error: 'value required' }, { status: 400 });
  }
  let opex = await Opex.findOne();
  if (!opex) opex = await Opex.create({ value });
  else {
    opex.value = value;
    await opex.save();
  }
  return NextResponse.json({ value: opex.value });
}
