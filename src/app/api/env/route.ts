import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({ url: process.env.DATABASE_URL });
}
