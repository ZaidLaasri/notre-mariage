-- Apply on a new Supabase project. No secrets. Monetary values are integer cents.
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create table public.profiles(id uuid primary key references auth.users on delete cascade, display_name text not null default '', created_at timestamptz not null default now());
create table public.weddings(id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 150), partner_names text not null default '', budget_minor bigint not null default 0 check(budget_minor>=0), eur_mad_numerator integer not null default 108 check(eur_mad_numerator>0), eur_mad_denominator integer not null default 10 check(eur_mad_denominator>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.wedding_members(wedding_id uuid not null references public.weddings on delete cascade, user_id uuid not null references auth.users on delete cascade, role text not null check(role in ('owner','partner')), primary key(wedding_id,user_id), unique(user_id), created_at timestamptz not null default now());
create function private.is_member(w uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.wedding_members where wedding_id=w and user_id=(select auth.uid())) $$;
grant execute on function private.is_member(uuid) to authenticated;
create table public.wedding_invitations(id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, email text not null, token_hash text not null unique, expires_at timestamptz not null default now()+interval '48 hours', accepted_at timestamptz, created_at timestamptz not null default now());

create table public.ceremonies(id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, name text not null check(length(name)>0), date date, budget_minor bigint not null default 0 check(budget_minor>=0), unique(wedding_id,id));
create table public.categories(id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, name text not null, criteria jsonb not null default '[]', unique(wedding_id,id));
create table public.service_requirements(id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, ceremony_id uuid not null, category_id uuid not null, name text not null, unique(wedding_id,id), foreign key(wedding_id,ceremony_id) references public.ceremonies(wedding_id,id), foreign key(wedding_id,category_id) references public.categories(wedding_id,id));
create table public.providers(id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, name text not null, phone text not null default '', whatsapp text not null default '', instagram text not null default '', website text not null default '', city text not null default '', address text not null default '', maps_url text not null default '', unique(wedding_id,id));
create table public.provider_offers(id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, requirement_id uuid not null, provider_id uuid not null, name text not null, description text not null default '', amount_minor bigint not null check(amount_minor>=0 and amount_minor<=900000000000), currency text not null default 'MAD' check(currency in ('MAD','EUR')), pricing text not null default 'forfait' check(pricing in ('forfait','personne','article')), status text not null default 'À contacter' check(status in ('À contacter','Contacté','En attente','Devis reçu','À comparer','Présélectionné','Sélectionné','Réservé','Refusé')), included text not null default '', excluded text not null default '', conditions text not null default '', availability text not null default '', pros text not null default '', cons text not null default '', favorite boolean not null default false, criteria jsonb not null default '{}', unique(wedding_id,id), foreign key(wedding_id,requirement_id) references public.service_requirements(wedding_id,id), foreign key(wedding_id,provider_id) references public.providers(wedding_id,id));
create table public.offer_photos(id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, offer_id uuid not null, path text not null unique, thumbnail_path text, caption text not null default '', position integer not null default 0, is_cover boolean not null default false, size_bytes bigint not null default 0 check(size_bytes>=0), unique(wedding_id,id), foreign key(wedding_id,offer_id) references public.provider_offers(wedding_id,id) on delete cascade, check(split_part(path,'/',1)=wedding_id::text));
create unique index one_cover_per_offer on public.offer_photos(offer_id) where is_cover;
create table public.offer_reviews(id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, offer_id uuid not null, user_id uuid not null references auth.users on delete cascade, rating integer not null check(rating between 1 and 5), quality integer check(quality between 1 and 5), value integer check(value between 1 and 5), aesthetic integer check(aesthetic between 1 and 5), comment text not null default '', unique(offer_id,user_id), foreign key(wedding_id,offer_id) references public.provider_offers(wedding_id,id) on delete cascade);
create table public.offer_comparisons(id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, requirement_id uuid not null, name text not null, weights jsonb not null default '{}', unique(wedding_id,id), foreign key(wedding_id,requirement_id) references public.service_requirements(wedding_id,id));
create table public.comparison_items(id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, comparison_id uuid not null, offer_id uuid not null, unique(comparison_id,offer_id), foreign key(wedding_id,comparison_id) references public.offer_comparisons(wedding_id,id) on delete cascade, foreign key(wedding_id,offer_id) references public.provider_offers(wedding_id,id));
create table public.bookings(id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, offer_id uuid not null, booked_on date not null default current_date, notes text not null default '', unique(wedding_id,id), unique(offer_id), foreign key(wedding_id,offer_id) references public.provider_offers(wedding_id,id));
create table public.expenses(id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, ceremony_id uuid not null, booking_id uuid, provider_id uuid, name text not null, amount_minor bigint not null check(amount_minor>=0 and amount_minor<=900000000000), currency text not null default 'MAD' check(currency in ('MAD','EUR')), due_on date, unique(wedding_id,id), foreign key(wedding_id,ceremony_id) references public.ceremonies(wedding_id,id), foreign key(wedding_id,booking_id) references public.bookings(wedding_id,id), foreign key(wedding_id,provider_id) references public.providers(wedding_id,id));
create table public.payments(id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, expense_id uuid not null, amount_minor bigint not null check(amount_minor>0), paid_on date not null default current_date, method text not null default 'Virement', responsible text not null default 'Commun', receipt_path text, foreign key(wedding_id,expense_id) references public.expenses(wedding_id,id));
create table public.guest_households(id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, name text not null, side text not null default 'Commun', phone text not null default '', notes text not null default '', unique(wedding_id,id));
create table public.guests(id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, household_id uuid not null, name text not null, is_child boolean not null default false, diet text not null default '', unique(wedding_id,id), foreign key(wedding_id,household_id) references public.guest_households(wedding_id,id));
create table public.ceremony_invitations(id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, guest_id uuid not null, ceremony_id uuid not null, status text not null default 'À inviter' check(status in ('À inviter','Envoyée','Confirmée','Refusée')), table_name text not null default '', unique(guest_id,ceremony_id), foreign key(wedding_id,guest_id) references public.guests(wedding_id,id) on delete cascade, foreign key(wedding_id,ceremony_id) references public.ceremonies(wedding_id,id));
create table public.tasks(id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, ceremony_id uuid, offer_id uuid, name text not null, due_on date, priority text not null default 'Normale', responsible text not null default 'Commun', done boolean not null default false, foreign key(wedding_id,ceremony_id) references public.ceremonies(wedding_id,id), foreign key(wedding_id,offer_id) references public.provider_offers(wedding_id,id));
create table public.gift_sets(id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, ceremony_id uuid not null, name text not null, color text not null default '', unique(wedding_id,id), foreign key(wedding_id,ceremony_id) references public.ceremonies(wedding_id,id));
create table public.gifts(id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, gift_set_id uuid not null, provider_id uuid, name text not null, quantity integer not null default 1 check(quantity>0), amount_minor bigint not null default 0 check(amount_minor>=0), currency text not null default 'MAD' check(currency in ('MAD','EUR')), material text not null default '', color text not null default '', tyafer text not null default '', purchased_on date, delivered boolean not null default false, unique(wedding_id,id), foreign key(wedding_id,gift_set_id) references public.gift_sets(wedding_id,id), foreign key(wedding_id,provider_id) references public.providers(wedding_id,id));
create table public.outfits(id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, ceremony_id uuid not null, name text not null, fitting_on date, status text not null default 'Inspiration', unique(wedding_id,id), foreign key(wedding_id,ceremony_id) references public.ceremonies(wedding_id,id));
create table public.outfit_items(id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, outfit_id uuid not null, name text not null, amount_minor bigint not null default 0 check(amount_minor>=0), foreign key(wedding_id,outfit_id) references public.outfits(wedding_id,id));
create table public.inspirations(id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, ceremony_id uuid, requirement_id uuid, provider_id uuid, name text not null, tags text[] not null default '{}', favorite boolean not null default false, path text, foreign key(wedding_id,ceremony_id) references public.ceremonies(wedding_id,id), foreign key(wedding_id,requirement_id) references public.service_requirements(wedding_id,id), foreign key(wedding_id,provider_id) references public.providers(wedding_id,id));
create table public.attachments(id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, gift_id uuid, outfit_id uuid, path text not null, caption text not null default '', foreign key(wedding_id,gift_id) references public.gifts(wedding_id,id), foreign key(wedding_id,outfit_id) references public.outfits(wedding_id,id), check(split_part(path,'/',1)=wedding_id::text));

create function private.touch() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin
 foreach t in array array['ceremonies','categories','service_requirements','providers','provider_offers','offer_photos','offer_reviews','offer_comparisons','comparison_items','bookings','expenses','payments','guest_households','guests','ceremony_invitations','tasks','gift_sets','gifts','outfits','outfit_items','inspirations','attachments'] loop
 execute format('alter table public.%I add column created_at timestamptz not null default now(), add column updated_at timestamptz not null default now()',t);
 execute format('create trigger touch before update on public.%I for each row execute function private.touch()',t);
 execute format('create index on public.%I(wedding_id)',t);
 execute format('alter table public.%I enable row level security',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 if t <> 'offer_reviews' then
 execute format('create policy members on public.%I for all to authenticated using(private.is_member(wedding_id)) with check(private.is_member(wedding_id))',t);
 else
 execute 'create policy reviews_read on public.offer_reviews for select to authenticated using(private.is_member(wedding_id))';
 execute 'create policy reviews_write on public.offer_reviews for all to authenticated using(private.is_member(wedding_id) and user_id=auth.uid()) with check(private.is_member(wedding_id) and user_id=auth.uid())';
 end if;
 end loop;
end $$;
alter table public.profiles enable row level security;
alter table public.weddings enable row level security;
alter table public.wedding_members enable row level security;
alter table public.wedding_invitations enable row level security;
create policy own_profile on public.profiles for all to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy wedding_read on public.weddings for select to authenticated using(private.is_member(id));
create policy wedding_update on public.weddings for update to authenticated using(private.is_member(id)) with check(private.is_member(id));
create policy members_read on public.wedding_members for select to authenticated using(private.is_member(wedding_id));
grant select,update on public.weddings to authenticated;
grant select on public.wedding_members to authenticated;
grant select,insert,update on public.profiles to authenticated;
revoke insert,update,delete on public.wedding_members from authenticated,anon;
revoke all on public.wedding_invitations from authenticated,anon;

create function public.create_wedding(title text) returns uuid language plpgsql security definer set search_path='' as $$ declare w uuid; begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 insert into public.weddings(name) values(title) returning id into w;
 insert into public.wedding_members(wedding_id,user_id,role) values(w,auth.uid(),'owner');
 insert into public.ceremonies(wedding_id,name) values(w,'Khotoba — الخطوبة'),(w,'Drib Sdak — ضريب الصداق');
 insert into public.categories(wedding_id,name) values(w,'Lieu'),(w,'Traiteur'),(w,'Makeup'),(w,'Neggafa'),(w,'Dfou3'),(w,'Tenues'),(w,'Décoration');
 return w;
 end $$;
create function public.invite_partner(partner_email text) returns text language plpgsql security definer set search_path='' as $$ declare w uuid; token text; begin
 select wedding_id into w from public.wedding_members where user_id=auth.uid() and role='owner';
 if w is null or partner_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Invitation non autorisée ou email invalide'; end if;
 perform 1 from public.weddings where id=w for update;
 if (select count(*) from public.wedding_members where wedding_id=w)>=2 then raise exception 'Deux membres maximum'; end if;
 delete from public.wedding_invitations where wedding_id=w and accepted_at is null;
 token=encode(extensions.gen_random_bytes(32),'hex');
 insert into public.wedding_invitations(wedding_id,email,token_hash) values(w,lower(trim(partner_email)),encode(extensions.digest(token,'sha256'),'hex'));
 return token;
 end $$;
create function public.accept_invitation(token text) returns uuid language plpgsql security definer set search_path='' as $$ declare inv public.wedding_invitations; begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'Email vérifié requis'; end if;
 select * into inv from public.wedding_invitations where token_hash=encode(extensions.digest(token,'sha256'),'hex') and accepted_at is null and expires_at>now() for update;
 if inv.id is null or inv.email <> lower((select email from auth.users where id=auth.uid())) then raise exception 'Invitation invalide'; end if;
 perform 1 from public.weddings where id=inv.wedding_id for update;
 if (select count(*) from public.wedding_members where wedding_id=inv.wedding_id)>=2 then raise exception 'Espace complet'; end if;
 insert into public.wedding_members(wedding_id,user_id,role) values(inv.wedding_id,auth.uid(),'partner');
 update public.wedding_invitations set accepted_at=now() where id=inv.id;
 return inv.wedding_id;
 end $$;
revoke all on function public.create_wedding(text),public.invite_partner(text),public.accept_invitation(text) from public,anon;
grant execute on function public.create_wedding(text),public.invite_partner(text),public.accept_invitation(text) to authenticated;

-- Serialize financial changes on the expense row, including concurrent deposits.
create function private.validate_payment() returns trigger language plpgsql set search_path='' as $$ declare ceiling bigint; total bigint; begin
 select amount_minor into ceiling from public.expenses where id=new.expense_id and wedding_id=new.wedding_id for update;
 select coalesce(sum(amount_minor),0) into total from public.payments where expense_id=new.expense_id and id<>new.id;
 if total+new.amount_minor>ceiling then raise exception 'Le paiement dépasse le solde'; end if;
 return new;
 end $$;
create trigger validate_payment before insert or update on public.payments for each row execute function private.validate_payment();
create function private.validate_expense() returns trigger language plpgsql set search_path='' as $$ begin
 if new.amount_minor<(select coalesce(sum(amount_minor),0) from public.payments where expense_id=new.id) then raise exception 'Montant inférieur aux paiements'; end if;
 if new.currency<>old.currency and exists(select 1 from public.payments where expense_id=new.id) then raise exception 'Devise verrouillée après paiement'; end if;
 return new; end $$;
create trigger validate_expense before update on public.expenses for each row execute function private.validate_expense();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('wedding-photos','wedding-photos',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy photo_read on storage.objects for select to authenticated using(bucket_id='wedding-photos' and exists(select 1 from public.wedding_members where user_id=auth.uid() and wedding_id::text=(storage.foldername(name))[1]));
create policy photo_insert on storage.objects for insert to authenticated with check(bucket_id='wedding-photos' and exists(select 1 from public.wedding_members where user_id=auth.uid() and wedding_id::text=(storage.foldername(name))[1]));
create policy photo_delete on storage.objects for delete to authenticated using(bucket_id='wedding-photos' and exists(select 1 from public.wedding_members where user_id=auth.uid() and wedding_id::text=(storage.foldername(name))[1]));
