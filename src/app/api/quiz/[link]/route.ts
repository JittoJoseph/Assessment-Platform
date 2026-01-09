import { createClient } from '@/lib/supabase-client'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ link: string }> }
) {
  const { link } = await params
  const supabase = createClient()

  const { data: quiz, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('shareable_link', link)
    .single()

  if (error || !quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
  }

  const now = new Date()
  const start = new Date(quiz.start_time)
  const end = new Date(quiz.end_time)

  if (now < start || now > end) {
    return NextResponse.json({ error: 'Quiz not available' }, { status: 403 })
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
    }
  })
}