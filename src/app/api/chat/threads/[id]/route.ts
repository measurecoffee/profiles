import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fallbackThreadTitle } from '@/lib/chat/threads'

interface MessageRow {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'Thread id required' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: thread, error: threadError } = await supabase
      .from('chat_threads')
      .select('id, title, created_at, updated_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('archived_at', null)
      .maybeSingle()

    if (threadError) {
      console.error('Thread detail load failed:', threadError.message)
      return NextResponse.json({ error: 'Failed to load thread' }, { status: 500 })
    }

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('thread_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })

    if (messagesError) {
      console.error('Thread messages load failed:', messagesError.message)
      return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
    }

    return NextResponse.json({
      thread: {
        id: thread.id,
        title: thread.title || fallbackThreadTitle(),
        createdAt: thread.created_at,
        updatedAt: thread.updated_at,
      },
      messages: (messages ?? []).map((message) => ({
        id: (message as MessageRow).id,
        role: (message as MessageRow).role,
        content: (message as MessageRow).content,
        createdAt: (message as MessageRow).created_at,
      })),
    })
  } catch (error) {
    console.error('Chat thread detail API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
