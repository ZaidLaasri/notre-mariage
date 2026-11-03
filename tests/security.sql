\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email,email_confirmed_at) values
('00000000-0000-4000-a000-000000000001','a@example.test',now()),
('00000000-0000-4000-a000-000000000002','b@example.test',now()),
('00000000-0000-4000-a000-000000000003','c@example.test',now());
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000001',true);
select public.create_wedding('Test A') as wa \gset
select public.invite_partner('b@example.test') as token \gset
insert into public.providers(wedding_id,name) values(:'wa','Prestataire A') returning id as pa \gset
select id as ca from public.ceremonies where wedding_id=:'wa' limit 1 \gset
select id as cat from public.categories where wedding_id=:'wa' limit 1 \gset
insert into public.service_requirements(wedding_id,ceremony_id,category_id,name) values(:'wa',:'ca',:'cat','Besoin A') returning id as ra \gset
insert into public.provider_offers(wedding_id,requirement_id,provider_id,name,amount_minor) values(:'wa',:'ra',:'pa','Offre A',50000) returning id as oa \gset
insert into public.expenses(wedding_id,ceremony_id,name,amount_minor) values(:'wa',:'ca','Dépense A',10000) returning id as ea \gset
insert into public.payments(wedding_id,expense_id,amount_minor) values(:'wa',:'ea',6000);
insert into storage.objects(bucket_id,name) values('wedding-photos',:'wa'||'/test.webp');
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000002',true);
select public.accept_invitation(:'token');
insert into public.offer_reviews(wedding_id,offer_id,user_id,rating,comment) values(:'wa',:'oa',auth.uid(),5,'Avis B');
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000003',true);
select public.create_wedding('Test C') as wc \gset
insert into public.providers(wedding_id,name) values(:'wc','Prestataire C') returning id as pc \gset
do $$begin
 if (select count(*) from public.providers)<>1 then raise exception 'FAIL: cross wedding read'; end if;
 if (select count(*) from storage.objects)<>0 then raise exception 'FAIL: cross storage read'; end if;
 if (select count(*) from public.offer_reviews)<>0 then raise exception 'FAIL: review isolation'; end if;
end$$;
-- Use settings inside DO because psql variables are not substituted in dollar strings.
select set_config('test.wa',:'wa',true),set_config('test.ca',:'ca',true),set_config('test.ra',:'ra',true),set_config('test.pa',:'pa',true),set_config('test.ea',:'ea',true),set_config('test.pc',:'pc',true),set_config('test.token',:'token',true);
do $$begin
 begin
  insert into public.providers(wedding_id,name) values(current_setting('test.wa')::uuid,'Intrusion');
  raise exception 'FAIL: cross wedding insert accepted';
 exception when insufficient_privilege then null; end;
 begin
  insert into storage.objects(bucket_id,name) values('wedding-photos',current_setting('test.wa')||'/intrusion.webp');
  raise exception 'FAIL: storage insert accepted';
 exception when insufficient_privilege then null; end;
 begin
  perform public.accept_invitation(current_setting('test.token'));
  raise exception 'FAIL: token reuse accepted';
 exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000001',true);
do $$declare changed integer;begin
 if (select count(*) from public.offer_reviews)<>1 then raise exception 'FAIL: shared review unreadable'; end if;
 update public.offer_reviews set comment='Overwritten';get diagnostics changed=row_count;
 if changed<>0 then raise exception 'FAIL: other author review mutable'; end if;
 begin
  insert into public.provider_offers(wedding_id,requirement_id,provider_id,name,amount_minor) values(current_setting('test.wa')::uuid,current_setting('test.ra')::uuid,current_setting('test.pc')::uuid,'Cross link',1);
  raise exception 'FAIL: cross wedding FK accepted';
 exception when foreign_key_violation then null; end;
 begin
  insert into public.payments(wedding_id,expense_id,amount_minor) values(current_setting('test.wa')::uuid,current_setting('test.ea')::uuid,4001);
  raise exception 'FAIL: overpayment accepted';
 exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
 begin
  update public.expenses set amount_minor=5000 where id=current_setting('test.ea')::uuid;
  raise exception 'FAIL: expense reduced below paid';
 exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
 begin
  insert into public.wedding_members(wedding_id,user_id,role) values(current_setting('test.wa')::uuid,'00000000-0000-4000-a000-000000000003','partner');
  raise exception 'FAIL: direct membership insert accepted';
 exception when insufficient_privilege then null; end;
end$$;
do $$declare first_offer uuid;second_offer uuid;booked uuid;req uuid;w uuid;comparison uuid;i integer;new_offer uuid;begin
 w=current_setting('test.wa')::uuid;req=current_setting('test.ra')::uuid;
 select id into first_offer from public.provider_offers where requirement_id=req limit 1;
 insert into public.provider_offers(wedding_id,requirement_id,provider_id,name,amount_minor) values(w,req,current_setting('test.pa')::uuid,'Second choice',100) returning id into second_offer;
 perform public.decide_offer(first_offer);perform public.decide_offer(second_offer);
 if (select selected_offer_id from public.service_requirements where id=req)<>second_offer then raise exception 'FAIL: decision not replaced'; end if;
 if (select count(*) from public.provider_offers where requirement_id=req and status='Sélectionné')<>1 then raise exception 'FAIL: more than one selected offer'; end if;
 booked=public.book_offer(second_offer);
 if (select count(*) from public.payments)<>1 then raise exception 'FAIL: booking caused payment'; end if;
 perform public.decide_offer(second_offer,true);
 if not exists(select 1 from public.bookings where id=booked) then raise exception 'FAIL: undo decision cancelled booking'; end if;
 perform public.cancel_booking(booked);
 if exists(select 1 from public.bookings where id=booked) then raise exception 'FAIL: cancel booking failed'; end if;
 insert into public.offer_comparisons(wedding_id,requirement_id,name) values(w,req,'Test') returning id into comparison;
 for i in 1..4 loop
 insert into public.provider_offers(wedding_id,requirement_id,provider_id,name,amount_minor) values(w,req,current_setting('test.pa')::uuid,'Choice '||i,100) returning id into new_offer;
 insert into public.comparison_items(wedding_id,comparison_id,offer_id) values(w,comparison,new_offer);
 end loop;
 begin
 insert into public.comparison_items(wedding_id,comparison_id,offer_id) values(w,comparison,first_offer);
 raise exception 'FAIL: five comparison items accepted';
 exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if;end;
end$$;
rollback;
\echo 'PASS: shared access, isolation, foreign keys, storage, review ownership, invitations, payments, decisions, bookings, comparison limit'
