CREATE TABLE public.user_roles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('admin')),
 UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.account_access (
 user_id uuid PRIMARY KEY,
 email text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 requested_at timestamptz NOT NULL DEFAULT now(),
 reviewed_at timestamptz,
 reviewed_by uuid
);
GRANT SELECT ON public.account_access TO authenticated;
GRANT ALL ON public.account_access TO service_role;
ALTER TABLE public.account_access ENABLE ROW LEVEL SECURITY;

INSERT INTO public.account_access (user_id,email,status,reviewed_at)
 SELECT id,coalesce(email,''),'approved',now() FROM auth.users;

CREATE FUNCTION public.is_access_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin');
$$;
CREATE FUNCTION public.is_account_approved() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.account_access WHERE user_id=auth.uid() AND status='approved');
$$;
REVOKE ALL ON FUNCTION public.is_access_admin() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.is_account_approved() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_access_admin(),public.is_account_approved() TO authenticated;
CREATE POLICY "Read own application or admin applications" ON public.account_access FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.is_access_admin());

CREATE FUNCTION public.register_account_application() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.account_access(user_id,email) VALUES(NEW.id,coalesce(NEW.email,'')) ON CONFLICT(user_id) DO NOTHING;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.register_account_application() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER register_account_application AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.register_account_application();

CREATE FUNCTION public.review_account_application(p_user_id uuid,p_status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT public.is_access_admin() OR NOT public.is_account_approved() THEN RAISE EXCEPTION 'Owner approval required'; END IF;
 IF p_status NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid approval decision'; END IF;
 IF p_user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_user_id AND role='admin') THEN RAISE EXCEPTION 'Cannot change owner access'; END IF;
 UPDATE public.account_access SET status=p_status,reviewed_at=now(),reviewed_by=auth.uid() WHERE user_id=p_user_id AND status='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'Application is no longer pending'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.review_account_application(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_account_application(uuid,text) TO authenticated;

ALTER POLICY "Users manage their own data" ON public.user_data USING (auth.uid()=user_id AND public.is_account_approved()) WITH CHECK (auth.uid()=user_id AND public.is_account_approved());
ALTER POLICY "Owners read their QR links" ON public.attendance_links USING (owner_id=auth.uid() AND public.is_account_approved());
ALTER POLICY "Owners read attendance" ON public.worker_attendance USING (owner_id=auth.uid() AND public.is_account_approved());