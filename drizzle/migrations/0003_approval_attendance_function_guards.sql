CREATE OR REPLACE FUNCTION public.list_project_attendance(p_project_id text,p_date date) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'workerId',worker_id,'workerName',worker_name,'date',attendance_date,'checkedInAt',checked_in_at) ORDER BY checked_in_at),'[]'::jsonb) FROM public.worker_attendance WHERE owner_id=auth.uid() AND public.is_account_approved() AND project_id=p_project_id AND attendance_date=p_date;
$$;
CREATE OR REPLACE FUNCTION public.manage_attendance_link(p_project_id text,p_action text DEFAULT 'get') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_link public.attendance_links; v_owner uuid := auth.uid();
BEGIN
 IF v_owner IS NULL OR NOT public.is_account_approved() THEN RAISE EXCEPTION 'Approved account required'; END IF;
 IF p_action NOT IN ('get','rotate','disable') OR length(p_project_id) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid request'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_data u,jsonb_array_elements(u.projects) p WHERE u.user_id=v_owner AND p->>'id'=p_project_id) THEN RAISE EXCEPTION 'Project not found. Save and sync the project first.'; END IF;
 INSERT INTO public.attendance_links(owner_id,project_id) VALUES(v_owner,p_project_id) ON CONFLICT(owner_id,project_id) DO NOTHING;
 IF p_action='rotate' THEN UPDATE public.attendance_links SET token=gen_random_uuid(),active=true WHERE owner_id=v_owner AND project_id=p_project_id; END IF;
 IF p_action='disable' THEN UPDATE public.attendance_links SET active=false WHERE owner_id=v_owner AND project_id=p_project_id; END IF;
 SELECT * INTO v_link FROM public.attendance_links WHERE owner_id=v_owner AND project_id=p_project_id;
 RETURN jsonb_build_object('token',v_link.token,'active',v_link.active);
END;
$$;