import { createClient } from '@/lib/supabase-client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()

  const { attempt_id, question_index, user_id } = await request.json()

  if (!user_id) {
    return NextResponse.json({ error: 'User ID required' }, { status: 401 })
  }

  // Get attempt
  const { data: attempt } = await supabase
    .from('attempts')
    .select('*, quizzes(*)')
    .eq('id', attempt_id)
    .eq('user_id', user_id)
    .single()

  if (!attempt || attempt.is_completed) {
    return NextResponse.json({ error: 'Invalid attempt' }, { status: 403 })
  }

  const quiz = attempt.quizzes

  // Check time
  const now = new Date()
  const end = new Date(quiz.end_time)

  if (now > end) {
    // Auto-submit
    await autoSubmit(supabase, attempt_id)
    return NextResponse.json({ error: 'Quiz ended' }, { status: 403 })
  }

  // Get question
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('quiz_id', quiz.id)
    .order('id')

  if (!questions || question_index >= questions.length) {
    // All done, submit
    await autoSubmit(supabase, attempt_id)
    return NextResponse.json({ completed: true })
  }

  const question = questions[question_index]

  return NextResponse.json({
    question: {
      id: question.id,
      question_en: question.question_en,
      question_ml: question.question_ml,
      options_en: question.options_en,
      options_ml: question.options_ml,
      time_limit_seconds: question.time_limit_seconds,
      marks: question.marks
    }
  })
}

async function autoSubmit(supabase: any, attempt_id: string) {
  // Get all questions and answers
  const { data: answers } = await supabase
    .from('answers')
    .select('*, questions(*)')
    .eq('attempt_id', attempt_id)

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('quiz_id', (await supabase.from('attempts').select('quiz_id').eq('id', attempt_id).single()).data.quiz_id)

  // For unanswered questions, add skipped answers
  const answeredIds = new Set(answers.map((a: any) => a.question_id))
  const skipped = questions.filter((q: any) => !answeredIds.has(q.id))

  for (const q of skipped) {
    await supabase.from('answers').insert({
      attempt_id,
      question_id: q.id,
      selected_option: null,
      time_taken_seconds: q.time_limit_seconds, // or 0?
      is_correct: false,
      marks_obtained: 0
    })
  }

  // Calculate total score
  const allAnswers = await supabase
    .from('answers')
    .select('marks_obtained')
    .eq('attempt_id', attempt_id)

  const total = allAnswers.data.reduce((sum: number, a: any) => sum + a.marks_obtained, 0)

  await supabase
    .from('attempts')
    .update({
      submitted_at: new Date().toISOString(),
      total_score: total,
      is_completed: true
    })
    .eq('id', attempt_id)
}