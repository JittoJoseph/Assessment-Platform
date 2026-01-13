import { createClient } from '@/lib/supabase-client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()

  const { quiz_id, attempt_id, user_id } = await request.json()

  if (!user_id) {
    return NextResponse.json({ error: 'User ID required' }, { status: 401 })
  }

  // Handle resume case (attempt_id provided)
  if (attempt_id) {
    const { data: attempt } = await supabase
      .from('attempts')
      .select(`
        *,
        quizzes!inner (*)
      `)
      .eq('id', attempt_id)
      .eq('user_id', user_id)
      .single()

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    if (attempt.is_completed) {
      return NextResponse.json({ error: 'Attempt already completed' }, { status: 403 })
    }

    const quiz = attempt.quizzes

    // Check if quiz is still active
    const now = new Date()
    const end = new Date(quiz.end_time)

    if (now > end) {
      return NextResponse.json({ error: 'Quiz has expired' }, { status: 403 })
    }

    // Get questions for the quiz
    const { data: questions } = await supabase
      .from('questions')
      .select('id, question, options')
      .eq('quiz_id', quiz.id)
      .order('created_at')

    return NextResponse.json({
      attempt_id: attempt.id,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        end_time: quiz.end_time
      },
      questions: questions || [],
      resumed: true
    })
  }

  // Handle new attempt case (quiz_id provided)
  if (!quiz_id) {
    return NextResponse.json({ error: 'Quiz ID or Attempt ID required' }, { status: 400 })
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

  if (now < start) {
    return NextResponse.json({ error: `Quiz not yet available. Starts at ${start.toISOString()}` }, { status: 403 })
  }

  if (now > end) {
    return NextResponse.json({ error: `Quiz has expired. Ended at ${end.toISOString()}` }, { status: 403 })
  }

  // Check for existing attempt
  const { data: existing } = await supabase
    .from('attempts')
    .select('id, is_completed')
    .eq('user_id', user_id)
    .eq('quiz_id', quiz.id)
    .single()

  if (existing) {
    if (existing.is_completed) {
      return NextResponse.json({ error: 'Already attempted' }, { status: 403 })
    } else {
      // Resume existing incomplete attempt
      // Get questions for the quiz
      const { data: questions } = await supabase
        .from('questions')
        .select('id, question, options')
        .eq('quiz_id', quiz.id)
        .order('created_at')

      return NextResponse.json({
        attempt_id: existing.id,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          end_time: quiz.end_time
        },
        questions: questions || [],
        resumed: true
      })
    }
  }

  // Create new attempt
  const { data: attempt, error } = await supabase
    .from('attempts')
    .insert({
      user_id,
      quiz_id: quiz.id,
      started_at: new Date().toISOString(),
      is_completed: false
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get all questions for the quiz
  const { data: questions } = await supabase
    .from('questions')
    .select('id, question, options')
    .eq('quiz_id', quiz.id)
    .order('created_at')

  return NextResponse.json({ 
    attempt_id: attempt.id,
    quiz: {
      id: quiz.id,
      title: quiz.title,
      end_time: quiz.end_time
    },
    questions: questions || []
  })
}