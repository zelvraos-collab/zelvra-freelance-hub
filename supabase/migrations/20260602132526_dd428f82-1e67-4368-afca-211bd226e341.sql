CREATE TYPE public.ai_chat_role AS ENUM ('user', 'assistant', 'system');

CREATE TABLE public.ai_chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_chat_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.ai_chat_role NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_chat_conv_user ON public.ai_chat_conversations(user_id, updated_at DESC);
CREATE INDEX idx_ai_chat_history_conv ON public.ai_chat_history(conversation_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_conversations TO authenticated;
GRANT ALL ON public.ai_chat_conversations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_history TO authenticated;
GRANT ALL ON public.ai_chat_history TO service_role;

ALTER TABLE public.ai_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own conv select" ON public.ai_chat_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own conv insert" ON public.ai_chat_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own conv update" ON public.ai_chat_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own conv delete" ON public.ai_chat_conversations FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "own hist select" ON public.ai_chat_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own hist insert" ON public.ai_chat_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own hist delete" ON public.ai_chat_history FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_ai_chat_conv_updated_at
BEFORE UPDATE ON public.ai_chat_conversations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();