import { createClient } from '@/lib/supabase-client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()

  const { attempt_id, question_id, selected_option, time_taken_seconds, user_id } = await request.json()

  if (!user_id) {
    return NextResponse.json({ error: 'User ID required' }, { status: 401 })
  }

  // Get attempt and question
  const { data: attempt } = await supabase
    .from('attempts')
    .select('*, quizzes(*)')
    .eq('id', attempt_id)
    .eq('user_id', user_id)
    .single()

  if (!attempt || attempt.is_completed) {
    return NextResponse.json({ error: 'Invalid attempt' }, { status: 403 })
  }

  const { data: question } = await supabase
    .from('questions')
    .select('*')
    .eq('id', question_id)
    .single()

  if (!question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  // Validate time and correctness
  const is_correct = time_taken_seconds <= question.time_limit_seconds && selected_option === question.correct_answer
  const marks = is_correct ? 1 : 0

  // Save answer
  const { error } = await supabase
    .from('answers')
    .insert({
      attempt_id,
      question_id,
      selected_option,
      time_taken_seconds,
      is_correct,
      marks_obtained: marks
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}