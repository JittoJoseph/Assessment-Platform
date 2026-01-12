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
    .select(`
      *,
      quizzes!inner (*)
    `)
    .eq('id', attempt_id)
    .eq('user_id', user_id)
    .single()

  if (!attempt || attempt.is_completed) {
    return NextResponse.json({ error: 'Invalid attempt' }, { status: 403 })
  }

  const quiz = attempt.quizzes

  // Get all questions for this quiz once (batch fetch)
  const { data: allQuestions, error: questionsError } = await supabase
    .from('questions')
    .select('id, correct_answer')
    .eq('quiz_id', quiz.id)

  if (questionsError) {
    console.error('Questions fetch error:', questionsError)
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
  }

  // Create question lookup map
  const questionMap = new Map(allQuestions?.map(q => [q.id, q.correct_answer]) || [])

  // Get all existing answers for this attempt once (batch fetch)
  const { data: existingAnswers, error: answersError } = await supabase
    .from('answers')
    .select('id, question_id')
    .eq('attempt_id', attempt_id)

  if (answersError) {
    console.error('Existing answers fetch error:', answersError)
    return NextResponse.json({ error: 'Failed to fetch existing answers' }, { status: 500 })
  }

  // Create existing answers lookup map
  const existingAnswerMap = new Map(existingAnswers?.map(a => [a.question_id, a.id]) || [])

  // Process all answers in memory
  const toInsert = []
  const toUpdate = []
  let totalScore = 0

  for (const answer of answers) {
    if (!answer.question_id || !questionMap.has(answer.question_id)) {
      continue // Skip invalid question IDs
    }

    // Validate answer data
    const selected_option = typeof answer.selected_option === 'number' ? answer.selected_option : null

    // Get correct answer from our pre-fetched data
    const correct_answer = questionMap.get(answer.question_id)!

    // Validate correctness
    const is_correct = selected_option !== null && selected_option === correct_answer
    const marks = is_correct ? 1 : 0
    totalScore += marks

    const answerData = {
      attempt_id,
      question_id: answer.question_id,
      selected_option,
      is_correct,
      marks_obtained: marks
    }

    // Determine if this is an insert or update
    if (existingAnswerMap.has(answer.question_id)) {
      toUpdate.push({
        ...answerData,
        id: existingAnswerMap.get(answer.question_id),
        updated_at: new Date().toISOString(),
      })
    } else {
      toInsert.push(answerData)
    }
  }

  // Batch insert new answers
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('answers')
      .insert(toInsert)

    if (insertError) {
      console.error('Batch insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save answers' }, { status: 500 })
    }
  }

  // Batch update existing answers
  if (toUpdate.length > 0) {
    // Supabase doesn't support batch updates directly, so we'll use individual updates
    // But this is still much better than the original approach
    for (const updateData of toUpdate) {
      const { id, ...updateFields } = updateData
      const { error: updateError } = await supabase
        .from('answers')
        .update(updateFields)
        .eq('id', id)

      if (updateError) {
        console.error('Answer update error:', updateError)
        return NextResponse.json({ error: 'Failed to update answers' }, { status: 500 })
      }
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

  return NextResponse.json({ success: true })
}