-- Additive upgrade: Jhaz is independent from Dfou3. Existing records are retained.
begin;
create table public.trousseau_categories(
 id uuid primary key default gen_random_uuid(),wedding_id uuid not null references public.weddings on delete cascade,
 name text not null check(length(trim(name))>0),budget_minor bigint not null default 0 check(budget_minor>=0),unique(wedding_id,id));
create table public.trousseau_sets(
 id uuid primary key default gen_random_uuid(),wedding_id uuid not null references public.weddings on delete cascade,
 name text not null check(length(trim(name))>0),notes text not null default '',unique(wedding_id,id));
create table public.trousseau_items(
 id uuid primary key default gen_random_uuid(),wedding_id uuid not null references public.weddings on delete cascade,
 category_id uuid not null,set_id uuid,provider_id uuid,expense_id uuid unique,
 name text not null check(length(trim(name))>0),description text not null default '',notes text not null default '',
 quantity integer not null default 1 check(quantity>0),unit_minor bigint not null default 0 check(unit_minor>=0 and unit_minor<=900000000000),
 currency text not null default 'MAD' check(currency in ('MAD','EUR')),responsible text not null default 'Commun',
 status text not null default 'À acheter' check(status in ('À acheter','En recherche','Commandé','Acheté','Reçu','Préparé')),
 unique(wedding_id,id),foreign key(wedding_id,category_id) references public.trousseau_categories(wedding_id,id),
 foreign key(wedding_id,set_id) references public.trousseau_sets(wedding_id,id),foreign key(wedding_id,provider_id) references public.providers(wedding_id,id),
 foreign key(wedding_id,expense_id) references public.expenses(wedding_id,id));
create table public.moodboards(
 id uuid primary key default gen_random_uuid(),wedding_id uuid not null references public.weddings on delete cascade,
 ceremony_id uuid,name text not null check(length(trim(name))>0),theme text not null default 'Ambiance',description text not null default '',
 unique(wedding_id,id),foreign key(wedding_id,ceremony_id) references public.ceremonies(wedding_id,id));
alter table public.inspirations add column moodboard_id uuid,add column description text not null default '',add column colors text[] not null default '{}',
 add column source_url text not null default '' check(source_url='' or source_url ~ '^https://[^[:space:]]+$'),add column theme text not null default 'Ambiance',
 add column offer_id uuid,add column outfit_id uuid,add column task_id uuid,add column position integer not null default 0;
-- tasks did not previously need a composite target key.
alter table public.tasks add constraint tasks_wedding_id unique(wedding_id,id);
alter table public.inspirations add foreign key(wedding_id,moodboard_id) references public.moodboards(wedding_id,id),
 add foreign key(wedding_id,offer_id) references public.provider_offers(wedding_id,id),
 add foreign key(wedding_id,outfit_id) references public.outfits(wedding_id,id),add foreign key(wedding_id,task_id) references public.tasks(wedding_id,id);
create table public.inspiration_comments(
 id uuid primary key default gen_random_uuid(),wedding_id uuid not null references public.weddings on delete cascade,
 inspiration_id uuid not null,user_id uuid not null references auth.users on delete cascade,body text not null check(length(trim(body))>0),
 foreign key(wedding_id,inspiration_id) references public.inspirations(wedding_id,id) on delete cascade);
create table public.timeline_events(
 id uuid primary key default gen_random_uuid(),wedding_id uuid not null references public.weddings on delete cascade,ceremony_id uuid not null,
 title text not null check(length(trim(title))>0),start_minute integer not null check(start_minute between 0 and 2879),
 end_minute integer not null check(end_minute between 1 and 2880),check(end_minute>start_minute),
 description text not null default '',public_note text not null default '',location text not null default '',responsible text not null default '',
 logistics text not null default '',status text not null default 'Prévu' check(status in ('Prévu','Confirmé','En cours','Terminé','Annulé')),
 position integer not null default 0,offer_id uuid,unique(wedding_id,id),
 foreign key(wedding_id,ceremony_id) references public.ceremonies(wedding_id,id),foreign key(wedding_id,offer_id) references public.provider_offers(wedding_id,id));
create table public.timeline_event_providers(
 id uuid primary key default gen_random_uuid(),wedding_id uuid not null references public.weddings on delete cascade,event_id uuid not null,provider_id uuid not null,
 unique(event_id,provider_id),foreign key(wedding_id,event_id) references public.timeline_events(wedding_id,id) on delete cascade,
 foreign key(wedding_id,provider_id) references public.providers(wedding_id,id));

do $$declare t text;begin
 foreach t in array array['trousseau_categories','trousseau_sets','trousseau_items','moodboards','inspiration_comments','timeline_events','timeline_event_providers'] loop
 execute format('alter table public.%I add column created_at timestamptz not null default now(),add column updated_at timestamptz not null default now()',t);
 execute format('create trigger touch before update on public.%I for each row execute function private.touch()',t);
 execute format('create index on public.%I(wedding_id)',t);
 execute format('alter table public.%I enable row level security',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 if t<>'inspiration_comments' then
 execute format('create policy members on public.%I for all to authenticated using(private.is_member(wedding_id)) with check(private.is_member(wedding_id))',t);
 else
 execute 'create policy comments_read on public.inspiration_comments for select to authenticated using(private.is_member(wedding_id))';
 execute 'create policy comments_write on public.inspiration_comments for all to authenticated using(private.is_member(wedding_id) and user_id=auth.uid()) with check(private.is_member(wedding_id) and user_id=auth.uid())';
 end if;end loop;end$$;
create index on public.timeline_events(ceremony_id,start_minute);
create index on public.inspirations(moodboard_id,position);
create index on public.inspiration_comments(inspiration_id);

alter table public.attachments add column trousseau_item_id uuid,add column trousseau_set_id uuid;
alter table public.attachments drop constraint one_attachment_target;
alter table public.attachments add constraint one_attachment_target check(num_nonnulls(gift_id,outfit_id,gift_set_id,inspiration_id,trousseau_item_id,trousseau_set_id)=1),
 add foreign key(wedding_id,trousseau_item_id) references public.trousseau_items(wedding_id,id),
 add foreign key(wedding_id,trousseau_set_id) references public.trousseau_sets(wedding_id,id);
create unique index attachment_cover_jhaz on public.attachments(trousseau_item_id) where is_cover and trousseau_item_id is not null;
create unique index attachment_cover_jhaz_set on public.attachments(trousseau_set_id) where is_cover and trousseau_set_id is not null;

-- Package reference groups two independent Makeup and Hair offers; no automatic expense.
alter table public.provider_offers add column package_reference text not null default '';
alter table public.categories add column kind text check(kind in ('makeup','hair','vehicle')),add column parent_name text not null default '';
create unique index category_builtin_kind on public.categories(wedding_id,kind) where kind is not null;
update public.categories c set kind='makeup' where lower(trim(c.name))='makeup' and not exists(select 1 from public.categories c2 where c2.wedding_id=c.wedding_id and lower(trim(c2.name))='makeup' and c2.id::text<c.id::text);
create function private.seed_extension_categories(w uuid) returns void language plpgsql security definer set search_path='' as $$begin
 insert into public.categories(wedding_id,name,kind,parent_name,criteria) values
 (w,'Makeup','makeup','Beauté','["Essai maquillage","Date de l’essai","Produits","Déplacement","Durée","Retouches"]'),
 (w,'Hair / Coiffure','hair','Beauté','["Type de coiffure","Essai coiffure","Date de l’essai","Accessoires","Extensions","Déplacement","Durée","Retouches"]'),
 (w,'Voiture de cortège','vehicle','Transports','["Marque","Modèle","Type","Couleur","Durée de location","Chauffeur inclus","Décoration florale incluse","Kilométrage autorisé","Frais supplémentaires","Caution","Prise en charge","Parcours","Heure de départ","Heure d’arrivée"]')
 on conflict(wedding_id,kind) where kind is not null do nothing;
end$$;
revoke all on function private.seed_extension_categories(uuid) from public,anon,authenticated;
do $$declare w uuid;begin for w in select id from public.weddings loop perform private.seed_extension_categories(w);end loop;end$$;
-- AFTER INSERT wedding fires before create_wedding's generic seeds: it creates just Hair/vehicle.
-- Makeup is seeded later by the existing create_wedding RPC and normalized below via category trigger.
create function private.normalize_makeup_category() returns trigger language plpgsql set search_path='' as $$begin
 if new.kind is null and lower(trim(new.name))='makeup' and not exists(select 1 from public.categories where wedding_id=new.wedding_id and kind='makeup') then new.kind='makeup';new.parent_name='Beauté';new.criteria='["Essai maquillage","Date de l’essai","Produits","Déplacement","Durée","Retouches"]';end if;return new;end$$;
create trigger normalize_makeup before insert on public.categories for each row execute function private.normalize_makeup_category();
create function private.seed_new_wedding_extensions() returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into public.categories(wedding_id,name,kind,parent_name,criteria) values
 (new.id,'Hair / Coiffure','hair','Beauté','["Type de coiffure","Essai coiffure","Date de l’essai","Accessoires","Extensions","Déplacement","Durée","Retouches"]'),
 (new.id,'Voiture de cortège','vehicle','Transports','["Marque","Modèle","Type","Couleur","Durée de location","Chauffeur inclus","Décoration florale incluse","Kilométrage autorisé","Frais supplémentaires","Caution","Prise en charge","Parcours","Heure de départ","Heure d’arrivée"]');return new;end$$;
create trigger seed_wedding_extensions after insert on public.weddings for each row execute function private.seed_new_wedding_extensions();

-- Atomic linkage: repeated calls return the same expense, never a second budget entry.
create function public.engage_trousseau(item uuid,ceremony uuid) returns uuid language plpgsql set search_path='' as $$declare r public.trousseau_items;e uuid;begin
 select * into r from public.trousseau_items where id=item for update;
 if r.id is null then raise exception 'Article inaccessible';end if;
 if r.expense_id is not null then return r.expense_id;end if;
 insert into public.expenses(wedding_id,ceremony_id,provider_id,name,amount_minor,currency) values(r.wedding_id,ceremony,r.provider_id,'Trousseau · '||r.name,r.unit_minor*r.quantity,r.currency) returning id into e;
 update public.trousseau_items set expense_id=e where id=item;return e;
end$$;
create function public.reorder_timeline(ceremony uuid,ordered_ids uuid[]) returns void language plpgsql set search_path='' as $$declare w uuid;begin
 select wedding_id into w from public.ceremonies where id=ceremony for update;
 if w is null then raise exception 'Cérémonie inaccessible';end if;
 if cardinality(ordered_ids)<>(select count(*) from public.timeline_events where ceremony_id=ceremony) or cardinality(ordered_ids)<>(select count(distinct x) from unnest(ordered_ids) x) or exists(select 1 from unnest(ordered_ids) x where not exists(select 1 from public.timeline_events where id=x and ceremony_id=ceremony)) then raise exception 'Ordre périmé : actualisez';end if;
 update public.timeline_events e set position=o.n-1 from unnest(ordered_ids) with ordinality o(id,n) where e.id=o.id;
end$$;
create function public.save_timeline_event(event_data jsonb,provider_ids uuid[]) returns uuid language plpgsql set search_path='' as $$declare r public.timeline_events;eid uuid;w uuid;begin
 r=jsonb_populate_record(null::public.timeline_events,event_data);
 select wedding_id into w from public.ceremonies where id=r.ceremony_id for update;
 if w is null then raise exception 'Cérémonie inaccessible';end if;
 eid=coalesce(r.id,gen_random_uuid());
 if r.id is not null and not exists(select 1 from public.timeline_events where id=r.id and wedding_id=w) then raise exception 'Étape inaccessible';end if;
 insert into public.timeline_events(id,wedding_id,ceremony_id,title,start_minute,end_minute,description,public_note,location,responsible,logistics,status,position,offer_id)
 values(eid,w,r.ceremony_id,r.title,r.start_minute,r.end_minute,coalesce(r.description,''),coalesce(r.public_note,''),coalesce(r.location,''),coalesce(r.responsible,''),coalesce(r.logistics,''),coalesce(r.status,'Prévu'),coalesce(r.position,0),r.offer_id)
 on conflict(id) do update set ceremony_id=excluded.ceremony_id,title=excluded.title,start_minute=excluded.start_minute,end_minute=excluded.end_minute,description=excluded.description,public_note=excluded.public_note,location=excluded.location,responsible=excluded.responsible,logistics=excluded.logistics,status=excluded.status,position=excluded.position,offer_id=excluded.offer_id;
 delete from public.timeline_event_providers where event_id=eid;
 insert into public.timeline_event_providers(wedding_id,event_id,provider_id) select w,eid,p from (select distinct unnest(provider_ids) p) v;return eid;
end$$;
revoke all on function public.engage_trousseau(uuid,uuid),public.reorder_timeline(uuid,uuid[]),public.save_timeline_event(jsonb,uuid[]) from public,anon;
grant execute on function public.engage_trousseau(uuid,uuid),public.reorder_timeline(uuid,uuid[]),public.save_timeline_event(jsonb,uuid[]) to authenticated;
create function public.reorder_moodboard(board uuid,ordered_ids uuid[]) returns void language plpgsql set search_path='' as $$declare w uuid;begin
 if board is not null then select wedding_id into w from public.moodboards where id=board for update;else select wedding_id into w from public.wedding_members where user_id=auth.uid();end if;
 if w is null or not private.is_member(w) then raise exception 'Moodboard inaccessible';end if;
 if cardinality(ordered_ids)<>(select count(*) from public.inspirations where wedding_id=w and moodboard_id is not distinct from board) or cardinality(ordered_ids)<>(select count(distinct x) from unnest(ordered_ids) x) or exists(select 1 from unnest(ordered_ids) x where not exists(select 1 from public.inspirations where id=x and wedding_id=w and moodboard_id is not distinct from board)) then raise exception 'Ordre périmé : actualisez';end if;
 update public.inspirations i set position=o.n-1 from unnest(ordered_ids) with ordinality o(id,n) where i.id=o.id;
end$$;
create function private.validate_timeline_offer() returns trigger language plpgsql set search_path='' as $$begin
 if new.offer_id is not null and not exists(select 1 from public.provider_offers o join public.service_requirements r on r.id=o.requirement_id where o.id=new.offer_id and r.ceremony_id=new.ceremony_id and o.wedding_id=new.wedding_id) then raise exception 'Cette proposition appartient à une autre cérémonie';end if;return new;end$$;
create trigger validate_timeline_offer before insert or update on public.timeline_events for each row execute function private.validate_timeline_offer();
revoke all on function public.reorder_moodboard(uuid,uuid[]) from public,anon;
grant execute on function public.reorder_moodboard(uuid,uuid[]) to authenticated;
commit;
