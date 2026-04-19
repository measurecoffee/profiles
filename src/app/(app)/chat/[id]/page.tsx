import { redirect } from 'next/navigation'
import ChatView, { type InitialChatMessage } from '@/components/chat-view'
import { createClient } from '@/lib/supabase/server'

interface ChatThreadPageProps {
  params: Promise<{ id: string }>
}

export default async function ChatThreadPage({ params }: ChatThreadPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: thread } = await supabase
    .from('chat_threads')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!thread) {
    redirect('/chat?new=1')
  }

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('thread_id', thread.id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })

  const initialMessages: InitialChatMessage[] = (messages ?? []).map((message) => ({
    role: message.role as 'user' | 'assistant',
    content: message.content,
    createdAt: message.created_at,
  }))

  return <ChatView key={thread.id} initialThreadId={thread.id} initialMessages={initialMessages} />
}
