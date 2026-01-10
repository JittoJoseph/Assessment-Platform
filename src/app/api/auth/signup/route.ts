import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@/lib/supabase-client'

export async function POST(request: NextRequest) {
  try {
    const { full_name, email, phone, password } = await request.json()

    // Validate input
    if (!full_name?.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    }

    if (full_name.length > 100) {
      return NextResponse.json({ error: 'Full name must be less than 100 characters' }, { status: 400 })
    }

    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    if (email.length > 254) {
      return NextResponse.json({ error: 'Email is too long' }, { status: 400 })
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    if (!phone?.trim()) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    if (phone.length > 20) {
      return NextResponse.json({ error: 'Phone number must be less than 20 characters' }, { status: 400 })
    }

    // Basic phone validation (allow international formats)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
    }

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 })
    }

    if (password.length > 128) {
      return NextResponse.json({ error: 'Password must be less than 128 characters' }, { status: 400 })
    }

    const supabase = createClient()

    // Check if email or phone already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .or(`email.eq.${email.toLowerCase().trim()},phone.eq.${phone.trim()}`)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Email or phone already registered' }, { status: 409 })
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12)

    // Create profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        full_name: full_name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        password_hash,
        role: 'user'
      })
      .select()
      .single()

    if (error) {
      console.error('Profile creation error:', error)
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
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