import { signIn } from '@/lib/actions/user.actions';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log('[API] Sign in request for:', email);
    
    const user = await signIn({ email, password });

    if (!user) {
      console.log('[API] Sign in failed');
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    console.log('[API] Sign in successful, setting cookies and redirecting');
    
    const response = NextResponse.json({ success: true, user });
    
    return response;
  } catch (error) {
    console.error('[API] Sign in error:', error);
    return NextResponse.json(
      { error: 'An error occurred during sign in' },
      { status: 500 }
    );
  }
}
