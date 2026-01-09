import { NextResponse } from 'next/server';
import { getStarterCategories } from '@/lib/categoryStore';

export async function GET() {
  try {
    const categories = getStarterCategories();
    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch starter categories' },
      { status: 500 }
    );
  }
}
