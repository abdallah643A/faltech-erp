
CREATE POLICY "Authenticated users can delete sync error logs"
ON public.sync_error_logs FOR DELETE TO authenticated USING (true);
