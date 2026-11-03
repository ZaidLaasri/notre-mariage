alter table public.attachments add column gift_set_id uuid, add column inspiration_id uuid, add column thumbnail_path text, add column position integer not null default 0, add column is_cover boolean not null default false, add column size_bytes bigint not null default 0 check(size_bytes>=0);
alter table public.inspirations add constraint inspiration_wedding_id unique(wedding_id,id);
alter table public.attachments add foreign key(wedding_id,gift_set_id) references public.gift_sets(wedding_id,id), add foreign key(wedding_id,inspiration_id) references public.inspirations(wedding_id,id), add constraint one_attachment_target check(num_nonnulls(gift_id,outfit_id,gift_set_id,inspiration_id)=1);
create unique index attachment_cover_gift on public.attachments(gift_id) where is_cover and gift_id is not null;
create unique index attachment_cover_outfit on public.attachments(outfit_id) where is_cover and outfit_id is not null;
create unique index attachment_cover_set on public.attachments(gift_set_id) where is_cover and gift_set_id is not null;
create unique index attachment_cover_inspiration on public.attachments(inspiration_id) where is_cover and inspiration_id is not null;
