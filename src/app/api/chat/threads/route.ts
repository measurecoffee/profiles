import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildThreadPreview, deriveThreadTitle, fallbackThreadTitle } from '@/lib/chat/threads'

interface ThreadSummaryRow {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface MessagePreviewRow {
  thread_id: string
  content: string
  created_at: string
}

function formatThreadSummary(
  thread: ThreadSummaryRow,
  latestMessage: MessagePreviewRow | undefined
) {
  return {
    id: thread.id,
    title: thread.title || fallbackThreadTitle(),
    createdAt: thread.created_at,
    updatedAt: thread.updated_at,
    lastMessageAt: latestMessage?.created_at ?? null,
    preview: latestMessage ? buildThreadPreview(latestMessage.content) : null,
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: threads, error: threadError } = await supabase
      .from('chat_threads')
      .select('id, title, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(25)

    if (threadError) {
      console.error('Thread list load failed:', threadError.message)
      return NextResponse.json({ error: 'Failed to load threads' }, { status: 500 })
    }

    if (!threads || threads.length === 0) {
      return NextResponse.json({ threads: [] })
    }

    const threadIds = threads.map((thread) => thread.id)

    const { data: messages, error: messageError } = await supabase
      .from('chat_messages')
      .select('thread_id, content, created_at')
      .eq('user_id', user.id)
      .in('thread_id', threadIds)
      .order('created_at', { ascending: false })

    if (messageError) {
      console.error('Thread previews load failed:', messageError.message)
      return NextResponse.json({ error: 'Failed to load thread previews' }, { status: 500 })
    }

    const latestByThreadId = new Map<string, MessagePreviewRow>()
    for (const message of (messages ?? []) as MessagePreviewRow[]) {
      if (!latestByThreadId.has(message.thread_id)) {
        latestByThreadId.set(message.thread_id, message)
      }
    }

    const summaries = (threads as ThreadSummaryRow[]).map((thread) =>
      formatThreadSummary(thread, latestByThreadId.get(thread.id))
    )

    return NextResponse.json({ threads: summaries })
  } catch (error) {
    console.error('Chat threads API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const requestedTitle =
      body && typeof body.title === 'string' ? body.title : fallbackThreadTitle()

    const { data: thread, error } = await supabase
      .from('chat_threads')
      .insert({
        user_id: user.id,
        title: deriveThreadTitle(requestedTitle),
      })
      .select('id, title, created_at, updated_at')
      .single()

    if (error || !thread) {
      console.error('Thread creation failed:', error?.message ?? 'Unknown error')
      return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 })
    }

    return NextResponse.json(
      {
        thread: {
          id: thread.id,
          title: thread.title,
          createdAt: thread.created_at,
          updatedAt: thread.updated_at,
          lastMessageAt: null,
          preview: null,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Chat thread create API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
