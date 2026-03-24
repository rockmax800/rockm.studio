
-- Clients entity
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  contact_email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to clients" ON public.clients FOR ALL TO public USING (true) WITH CHECK (true);

-- Client project access with hashed token
CREATE TABLE public.client_project_access (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  access_token_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(client_id, project_id)
);

ALTER TABLE public.client_project_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to client_project_access" ON public.client_project_access FOR ALL TO public USING (true) WITH CHECK (true);

CREATE INDEX idx_client_project_access_token ON public.client_project_access(access_token_hash);
