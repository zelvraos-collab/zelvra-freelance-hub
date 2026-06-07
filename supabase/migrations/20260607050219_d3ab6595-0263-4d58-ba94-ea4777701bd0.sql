
CREATE POLICY "users upload own screenshots" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'session-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "users view own screenshots" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'session-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "clients view project screenshots" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'session-screenshots'
  AND EXISTS (
    SELECT 1 FROM public.session_screenshots ss
    JOIN public.tracked_sessions ts ON ts.id = ss.session_id
    JOIN public.projects p ON p.id = ts.project_id
    WHERE ss.storage_path = name AND p.user_id = auth.uid()
  )
);
