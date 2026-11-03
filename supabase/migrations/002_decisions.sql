alter table public.service_requirements add column selected_offer_id uuid;
alter table public.service_requirements add constraint selected_offer_same_wedding foreign key(wedding_id,selected_offer_id) references public.provider_offers(wedding_id,id);
create function private.validate_decision() returns trigger language plpgsql set search_path='' as $$begin
 if new.selected_offer_id is not null and not exists(select 1 from public.provider_offers where id=new.selected_offer_id and requirement_id=new.id and wedding_id=new.wedding_id) then raise exception 'La décision doit concerner ce besoin'; end if;
 return new; end $$;
create trigger validate_decision before insert or update on public.service_requirements for each row execute function private.validate_decision();
create function public.decide_offer(offer uuid,undo boolean default false) returns void language plpgsql set search_path='' as $$declare r uuid;begin
 select requirement_id into r from public.provider_offers where id=offer;
 if r is null then raise exception 'Offre inaccessible'; end if;
 perform 1 from public.service_requirements where id=r for update;
 update public.provider_offers set status='À comparer' where requirement_id=r and status='Sélectionné';
 update public.service_requirements set selected_offer_id=case when undo then null else offer end where id=r;
 if not undo then update public.provider_offers set status='Sélectionné' where id=offer and status<>'Réservé'; end if;
end$$;
create function public.book_offer(offer uuid) returns uuid language plpgsql set search_path='' as $$declare w uuid;b uuid;begin
 select wedding_id into w from public.provider_offers where id=offer for update;
 if w is null then raise exception 'Offre inaccessible'; end if;
 insert into public.bookings(wedding_id,offer_id) values(w,offer) returning id into b;
 update public.provider_offers set status='Réservé' where id=offer;
 return b;
end$$;
create function public.cancel_booking(booking uuid) returns void language plpgsql set search_path='' as $$declare o uuid;begin
 select offer_id into o from public.bookings where id=booking for update;
 if o is null then raise exception 'Réservation inaccessible'; end if;
 if exists(select 1 from public.expenses where booking_id=booking) then raise exception 'Cette réservation est liée à des dépenses. Gérez le remboursement et les engagements avant annulation.'; end if;
 delete from public.bookings where id=booking;
 update public.provider_offers set status=case when exists(select 1 from public.service_requirements where selected_offer_id=o) then 'Sélectionné' else 'À comparer' end where id=o;
end$$;
revoke all on function public.decide_offer(uuid,boolean),public.book_offer(uuid),public.cancel_booking(uuid) from public,anon;
grant execute on function public.decide_offer(uuid,boolean),public.book_offer(uuid),public.cancel_booking(uuid) to authenticated;

create function private.validate_comparison_item() returns trigger language plpgsql set search_path='' as $$declare req uuid;begin
 select requirement_id into req from public.offer_comparisons where id=new.comparison_id and wedding_id=new.wedding_id for update;
 if not exists(select 1 from public.provider_offers where id=new.offer_id and requirement_id=req and wedding_id=new.wedding_id) then raise exception 'Comparer des offres du même besoin uniquement'; end if;
 if (select count(*) from public.comparison_items where comparison_id=new.comparison_id and id<>new.id)>=4 then raise exception 'Quatre offres maximum'; end if;
 return new;
end$$;
create trigger validate_comparison_item before insert or update on public.comparison_items for each row execute function private.validate_comparison_item();
