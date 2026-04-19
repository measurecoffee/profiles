import { redirect } from 'next/navigation'
import ChatView from '@/components/chat-view'
import { createClient } from '@/lib/supabase/server'

interface ChatPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getSearchParamValue(value: string | string[] | undefined): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.length > 0) return value[0]
  return null
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const query = await searchParams
  const forceNew = getSearchParamValue(query.new) === '1'
  const from = getSearchParamValue(query.from)
  const fromCalculator = from === 'calculator'

  const { count: threadCount } = await supabase
    .from('chat_threads')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const hasAnyThreads = (threadCount ?? 0) > 0

  if (!forceNew) {
    if (hasAnyThreads) {
      const { data: latestThread } = await supabase
        .from('chat_threads')
        .select('id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!latestThread) {
        return (
          <ChatView
            key="new-chat"
            shouldBootstrapOnboarding={false}
          />
        )
      }

      const suffix = from ? `?from=${encodeURIComponent(from)}` : ''
      redirect(`/chat/${latestThread.id}${suffix}`)
    }
  }

  return (
    <ChatView
      key="new-chat"
      shouldBootstrapOnboarding={!hasAnyThreads && !fromCalculator}
    />
  )
}
