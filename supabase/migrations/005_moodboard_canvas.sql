-- Additive migration: preserve existing inspirations, attachments and membership RLS.
begin;
alter table public.inspirations
  add column canvas_x double precision,
  add column canvas_y double precision,
  add constraint inspiration_canvas_coordinates check (
    (canvas_x is null and canvas_y is null) or
    (canvas_x is not null and canvas_y is not null and
     canvas_x between -1000000 and 1000000 and canvas_y between -1000000 and 1000000)
  );
-- Give every legacy card a stable initial position, unaffected by search filters.
with layout as (
  select id, row_number() over(partition by wedding_id, moodboard_id order by position, name, id)-1 as n
  from public.inspirations
)
update public.inspirations i set canvas_x=(layout.n % 4)*280, canvas_y=(layout.n / 4)*310
from layout where i.id=layout.id;
commit;
