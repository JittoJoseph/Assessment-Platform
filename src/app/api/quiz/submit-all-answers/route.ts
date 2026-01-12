import { createClient } from '@/lib/supabase-client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()

  const { attempt_id, answers, user_id } = await request.json()

  // Validate input
  if (!user_id) {
    return NextResponse.json({ error: 'User ID required' }, { status: 401 })
  }

  if (!attempt_id) {
    return NextResponse.json({ error: 'Attempt ID required' }, { status: 400 })
  }

  if (!Array.isArray(answers)) {
    return NextResponse.json({ error: 'Answers must be an array' }, { status: 400 })
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

  // Validate answers
  const validQuestionIds = new Set()
  const { data: quizQuestions } = await supabase
    .from('questions')
    .select('id')
    .eq('quiz_id', quiz.id)

  quizQuestions?.forEach(q => validQuestionIds.add(q.id))

  // Process all answers
  const answerInserts = []
  let totalScore = 0

  for (const answer of answers) {
    if (!answer.question_id || !validQuestionIds.has(answer.question_id)) {
      continue // Skip invalid question IDs
    }

    // Validate answer data
    const selected_option = typeof answer.selected_option === 'number' ? answer.selected_option : null
    const time_taken_seconds = typeof answer.time_taken_seconds === 'number' ? Math.max(0, answer.time_taken_seconds) : 0

    // Get question to validate
    const { data: question } = await supabase
      .from('questions')
      .select('*')
      .eq('id', answer.question_id)
      .single()

    if (!question) continue

    // Validate correctness (time limits removed)
    const is_correct = selected_option !== null &&
                      selected_option === question.correct_answer
    const marks = is_correct ? 1 : 0
    totalScore += marks

    answerInserts.push({
      attempt_id,
      question_id: answer.question_id,
      selected_option,
      time_taken_seconds,
      is_correct,
      marks_obtained: marks
    })
  }

  // Insert or update all answers
  for (const answer of answerInserts) {
    const { error } = await supabase
      .from('answers')
      .upsert(answer, {
        onConflict: 'attempt_id,question_id'
      })

    if (error) {
      console.error('Answer upsert error:', error)
      return NextResponse.json({ error: 'Failed to save answers' }, { status: 500 })
    }
  }

  // Update attempt as completed
  const { error: updateError } = await supabase
    .from('attempts')
    .update({
      submitted_at: new Date().toISOString(),
      total_score: totalScore,
      is_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', attempt_id)

  if (updateError) {
    console.error('Attempt update error:', updateError)
    return NextResponse.json({ error: 'Failed to complete attempt' }, { status: 500 })
  }

  return NextResponse.json({ success: true, total_score: totalScore })
}