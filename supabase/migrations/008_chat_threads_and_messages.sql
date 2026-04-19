-- ============================================================
-- measure.coffee profiles — Phase 5: Persistent chat threads
-- ============================================================

-- -----------------------------------------------------------
-- CHAT THREADS
-- -----------------------------------------------------------
CREATE TABLE public.chat_threads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT 'New conversation',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE INDEX idx_chat_threads_user_updated
  ON public.chat_threads(user_id, updated_at DESC);

CREATE INDEX idx_chat_threads_user_created
  ON public.chat_threads(user_id, created_at DESC);

-- -----------------------------------------------------------
-- CHAT MESSAGES
-- -----------------------------------------------------------
CREATE TABLE public.chat_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('user', 'assistant')),
  content     text NOT NULL CHECK (length(trim(content)) > 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_thread_created
  ON public.chat_messages(thread_id, created_at ASC, id ASC);

CREATE INDEX idx_chat_messages_user_created
  ON public.chat_messages(user_id, created_at DESC);

-- Keep thread ordering aligned with fresh messages.
CREATE OR REPLACE FUNCTION public.touch_chat_thread_updated_at()
RETURNS trigger AS $$
BEGIN
  UPDATE public.chat_threads
  SET updated_at = NEW.created_at
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_touch_chat_thread_updated_at ON public.chat_messages;
CREATE TRIGGER trg_touch_chat_thread_updated_at
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_chat_thread_updated_at();

-- -----------------------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------------------
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Threads: users can only access their own rows.
CREATE POLICY "Users can view own chat threads"
  ON public.chat_threads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat threads"
  ON public.chat_threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat threads"
  ON public.chat_threads FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat threads"
  ON public.chat_threads FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage chat threads"
  ON public.chat_threads FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Messages: users can only read/write messages inside their own threads.
CREATE POLICY "Users can view own chat messages"
  ON public.chat_messages FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.chat_threads t
      WHERE t.id = thread_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.chat_threads t
      WHERE t.id = thread_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own chat messages"
  ON public.chat_messages FOR DELETE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.chat_threads t
      WHERE t.id = thread_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage chat messages"
  ON public.chat_messages FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
