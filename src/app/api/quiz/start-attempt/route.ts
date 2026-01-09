import { createClient } from '@/lib/supabase-client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()

  const { quiz_id, user_id } = await request.json()

  if (!user_id) {
    return NextResponse.json({ error: 'User ID required' }, { status: 401 })
  }

  // Check quiz exists and available
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', quiz_id)
    .single()

  if (!quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
  }

  const now = new Date()
  const start = new Date(quiz.start_time)
  const end = new Date(quiz.end_time)

  if (now < start || now > end) {
    return NextResponse.json({ error: 'Quiz not available' }, { status: 403 })
  }

  // Check no previous attempt
  const { data: existing } = await supabase
    .from('attempts')
    .select('id')
    .eq('user_id', user_id)
    .eq('quiz_id', quiz_id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Already attempted' }, { status: 403 })
  }

  // Create attempt
  const { data: attempt, error } = await supabase
    .from('attempts')
    .insert({
      user_id,
      quiz_id,
      started_at: new Date().toISOString(),
      is_completed: false
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ attempt_id: attempt.id })
}