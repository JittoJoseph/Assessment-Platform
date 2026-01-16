import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-client'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user')?.value

    if (!userCookie) {
      return NextResponse.json({ authenticated: false, error: 'Not authenticated' }, { status: 401 })
    }

    const cookieUser = JSON.parse(userCookie)

    // Query database to get current user role
    const supabase = createClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, full_name, email, id')
      .eq('id', cookieUser.id)
      .single()

    if (error || !profile) {
      return NextResponse.json({ authenticated: false, error: 'User not found' }, { status: 401 })
    }

    // Return user data with current role from database
    const user = {
      ...cookieUser,
      role: profile.role
    }

    return NextResponse.json({ authenticated: true, user })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ authenticated: false, error: 'Invalid session' }, { status: 401 })
  }
}