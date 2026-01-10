import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user')?.value

    if (!userCookie) {
      return NextResponse.json({ authenticated: false, error: 'Not authenticated' }, { status: 401 })
    }

    const user = JSON.parse(userCookie)
    return NextResponse.json({ authenticated: true, user })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ authenticated: false, error: 'Invalid session' }, { status: 401 })
  }
}