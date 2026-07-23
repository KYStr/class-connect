-- 0004_grade_aggregates.sql — de-identified grade stats for parents (SPEC L4).
-- Parents must never read other children's raw scores (RLS). Distribution & percentile
-- are exposed only via security-definer functions that return aggregates.

create or replace function get_score_distribution(p_exam_id uuid)
returns table(range text, lo int, hi int, count bigint)
language plpgsql
security definer
stable
set search_path = public
as $fn$
declare
  v_class uuid;
  v_show boolean;
  v_pub boolean;
begin
  select e.class_id, e.show_dist, e.published
    into v_class, v_show, v_pub
  from exams e
  where e.id = p_exam_id;

  if v_class is null then
    return;
  end if;

  if not is_class_member(v_class) then
    return;
  end if;

  -- Teachers can preview dist even when unpublished; parents only after publish + show_dist.
  if is_teacher_of(v_class) then
    if not v_show then
      return;
    end if;
  else
    if (not v_pub) or (not v_show) then
      return;
    end if;
  end if;

  return query
  select * from (
    values
      ('90-100'::text, 90, 100),
      ('80-89'::text,  80,  89),
      ('70-79'::text,  70,  79),
      ('60-69'::text,  60,  69),
      ('<=59'::text,    0,  59)
  ) as b(range, lo, hi)
  cross join lateral (
    select count(*)::bigint as count
    from scores s
    where s.exam_id = p_exam_id
      and s.score is not null
      and s.score between b.lo and b.hi
  ) c;
end;
$fn$;

create or replace function get_score_percentile(p_exam_id uuid, p_student_id uuid)
returns int
language plpgsql
security definer
stable
set search_path = public
as $fn$
declare
  v_class uuid;
  v_pub boolean;
  v_my int;
  v_total int;
  v_below int;
begin
  select e.class_id, e.published
    into v_class, v_pub
  from exams e
  where e.id = p_exam_id;

  if v_class is null then
    return 0;
  end if;

  -- Parent: only own child + published. Teacher: any student in class.
  if not (
    is_teacher_of(v_class)
    or (is_guardian_of(p_student_id) and v_pub)
  ) then
    return 0;
  end if;

  select s.score into v_my
  from scores s
  where s.exam_id = p_exam_id and s.student_id = p_student_id;

  if v_my is null then
    return 0;
  end if;

  select count(*)::int into v_total
  from scores s
  where s.exam_id = p_exam_id and s.score is not null;

  if v_total = 0 then
    return 0;
  end if;

  select count(*)::int into v_below
  from scores s
  where s.exam_id = p_exam_id and s.score is not null and s.score < v_my;

  return round((v_below::numeric / v_total) * 100)::int;
end;
$fn$;

grant execute on function get_score_distribution(uuid) to authenticated, service_role;
grant execute on function get_score_percentile(uuid, uuid) to authenticated, service_role;
