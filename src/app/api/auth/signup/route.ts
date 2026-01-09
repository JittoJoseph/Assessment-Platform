import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@/lib/supabase-client'

export async function POST(request: NextRequest) {
  try {
    const { full_name, email, phone, password } = await request.json()

    if (!full_name || !email || !phone || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const supabase = createClient()

    // Check if email or phone already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .or(`email.eq.${email},phone.eq.${phone}`)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Email or phone already registered' }, { status: 409 })
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10)

    // Create profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        full_name,
        email,
        phone,
        password_hash,
        role: 'user'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Return user data (without password)
    const { password_hash: _, ...user } = profile

    const response = NextResponse.json({ user, message: 'Account created successfully' })

    // Set user cookie
    response.cookies.set('user', JSON.stringify(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}