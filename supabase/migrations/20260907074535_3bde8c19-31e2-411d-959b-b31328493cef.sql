CREATE TABLE public.user_data (
  user_id uuid NOT NULL PRIMARY KEY,
  projects jsonb NOT NULL DEFAULT '[]'::jsonb,
  company jsonb NOT NULL DEFAULT '{}'::jsonb,
  site_managers jsonb NOT NULL DEFAULT '[]'::jsonb,
  workers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_data TO authenticated;
GRANT ALL ON public.user_data TO service_role;

ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own data"
ON public.user_data
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_data_updated_at
BEFORE UPDATE ON public.user_data
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();