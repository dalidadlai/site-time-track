CREATE TABLE public.attendance_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL,
 project_id text NOT NULL,
 token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_id, project_id)
);
GRANT SELECT ON public.attendance_links TO authenticated;
GRANT ALL ON public.attendance_links TO service_role;
ALTER TABLE public.attendance_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their QR links" ON public.attendance_links FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE TABLE public.worker_attendance (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL,
 project_id text NOT NULL,
 worker_id text NOT NULL,
 worker_name text NOT NULL,
 attendance_date date NOT NULL,
 checked_in_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_id, project_id, worker_id, attendance_date)
);
GRANT SELECT ON public.worker_attendance TO authenticated;
GRANT ALL ON public.worker_attendance TO service_role;
ALTER TABLE public.worker_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read attendance" ON public.worker_attendance FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE INDEX worker_attendance_owner_date_idx ON public.worker_attendance(owner_id, project_id, attendance_date);
CREATE FUNCTION public.manage_attendance_link(p_project_id text, p_action text DEFAULT 'get') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_link public.attendance_links; v_owner uuid := auth.uid();
BEGIN
 IF v_owner IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
 IF p_action NOT IN ('get','rotate','disable') OR length(p_project_id) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid request'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_data u, jsonb_array_elements(u.projects) p WHERE u.user_id = v_owner AND p->>'id' = p_project_id) THEN RAISE EXCEPTION 'Project not found. Save and sync the project first.'; END IF;
 INSERT INTO public.attendance_links(owner_id,project_id) VALUES(v_owner,p_project_id) ON CONFLICT(owner_id,project_id) DO NOTHING;
 IF p_action = 'rotate' THEN UPDATE public.attendance_links SET token = gen_random_uuid(),active = true WHERE owner_id = v_owner AND project_id = p_project_id; END IF;
 IF p_action = 'disable' THEN UPDATE public.attendance_links SET active = false WHERE owner_id = v_owner AND project_id = p_project_id; END IF;
 SELECT * INTO v_link FROM public.attendance_links WHERE owner_id = v_owner AND project_id = p_project_id;
 RETURN jsonb_build_object('token',v_link.token,'active',v_link.active);
END $$;
REVOKE ALL ON FUNCTION public.manage_attendance_link(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_attendance_link(text,text) TO authenticated;
CREATE FUNCTION public.attendance_checkin_info(p_token uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_link public.attendance_links; v_project jsonb; v_workers jsonb;
BEGIN
 SELECT * INTO v_link FROM public.attendance_links WHERE token = p_token AND active;
 IF NOT FOUND THEN RAISE EXCEPTION 'This check-in link is unavailable'; END IF;
 SELECT p INTO v_project FROM public.user_data u, jsonb_array_elements(u.projects) p WHERE u.user_id = v_link.owner_id AND p->>'id' = v_link.project_id;
 IF v_project IS NULL THEN RAISE EXCEPTION 'This project is unavailable'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',w->>'id','name',w->>'name') ORDER BY w->>'name'), '[]'::jsonb) INTO v_workers FROM public.user_data u, jsonb_array_elements(u.workers) w WHERE u.user_id = v_link.owner_id AND coalesce(w->>'id','') <> '' AND coalesce(w->>'name','') <> '';
 RETURN jsonb_build_object('projectName',v_project->>'name','date',(now() AT TIME ZONE 'Pacific/Auckland')::date,'workers',v_workers);
END $$;
REVOKE ALL ON FUNCTION public.attendance_checkin_info(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attendance_checkin_info(uuid) TO anon,authenticated;
CREATE FUNCTION public.submit_attendance_checkin(p_token uuid,p_worker_id text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_link public.attendance_links; v_name text; v_record public.worker_attendance; v_date date := (now() AT TIME ZONE 'Pacific/Auckland')::date; v_inserted boolean;
BEGIN
 IF length(p_worker_id) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Choose a worker'; END IF;
 SELECT * INTO v_link FROM public.attendance_links WHERE token = p_token AND active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'This check-in link is unavailable'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_data u, jsonb_array_elements(u.projects) p WHERE u.user_id=v_link.owner_id AND p->>'id'=v_link.project_id) THEN RAISE EXCEPTION 'This project is unavailable'; END IF;
 SELECT w->>'name' INTO v_name FROM public.user_data u,jsonb_array_elements(u.workers) w WHERE u.user_id=v_link.owner_id AND w->>'id'=p_worker_id;
 IF v_name IS NULL OR v_name = '' THEN RAISE EXCEPTION 'Worker not found'; END IF;
 INSERT INTO public.worker_attendance(owner_id,project_id,worker_id,worker_name,attendance_date) VALUES(v_link.owner_id,v_link.project_id,p_worker_id,v_name,v_date) ON CONFLICT(owner_id,project_id,worker_id,attendance_date) DO NOTHING RETURNING * INTO v_record;
 v_inserted := FOUND;
 IF NOT v_inserted THEN SELECT * INTO v_record FROM public.worker_attendance WHERE owner_id=v_link.owner_id AND project_id=v_link.project_id AND worker_id=p_worker_id AND attendance_date=v_date; END IF;
 RETURN jsonb_build_object('workerName',v_record.worker_name,'date',v_record.attendance_date,'checkedInAt',v_record.checked_in_at,'alreadyCheckedIn',NOT v_inserted);
END $$;
REVOKE ALL ON FUNCTION public.submit_attendance_checkin(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_attendance_checkin(uuid,text) TO anon,authenticated;
CREATE FUNCTION public.list_project_attendance(p_project_id text,p_date date) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'workerId',worker_id,'workerName',worker_name,'date',attendance_date,'checkedInAt',checked_in_at) ORDER BY checked_in_at),'[]'::jsonb) FROM public.worker_attendance WHERE owner_id=auth.uid() AND project_id=p_project_id AND attendance_date=p_date;
$$;
REVOKE ALL ON FUNCTION public.list_project_attendance(text,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_project_attendance(text,date) TO authenticated;