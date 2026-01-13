import { createClient } from '@/lib/supabase-client'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ link: string }> }
) {
  const { link } = await params
  const supabase = createClient()

  // Get user from cookie
  const cookieStore = await cookies()
  const userCookie = cookieStore.get('user')?.value
  const user = userCookie ? JSON.parse(userCookie) : null

  // Find quiz by id
  const { data: quiz, error } = await supabase
    .from('quizzes')
    .select('id, title, start_time, end_time')
    .eq('id', link)
    .single()

  if (error || !quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
  }

  const now = new Date()
  const start = new Date(quiz.start_time)
  const end = new Date(quiz.end_time)

  // Check if user has already completed this quiz
  let attemptStatus: 'none' | 'in_progress' | 'completed' = 'none'
  if (user) {
    const { data: attempt } = await supabase
      .from('attempts')
      .select('id, is_completed')
      .eq('user_id', user.id)
      .eq('quiz_id', quiz.id)
      .single()

    if (attempt) {
      attemptStatus = attempt.is_completed ? 'completed' : 'in_progress'
    }
  }

  // If already completed, return early with status
  if (attemptStatus === 'completed') {
    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        end_time: quiz.end_time
      },
      attemptStatus: 'completed'
    })
  }

  // Check time availability
  if (now < start) {
    return NextResponse.json({ error: 'Quiz has not started yet' }, { status: 403 })
  }

  if (now > end) {
    return NextResponse.json({ error: 'Quiz has ended' }, { status: 403 })
  }

  // Get questions count
  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', quiz.id)

  return NextResponse.json({
    quiz: {
      id: quiz.id,
      title: quiz.title,
      end_time: quiz.end_time,
      question_count: count
    },
    attemptStatus
  })
}