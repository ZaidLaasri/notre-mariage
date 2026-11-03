\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email,email_confirmed_at) values('10000000-0000-4000-a000-000000000001','jhaz-a@example.test',now()),('10000000-0000-4000-a000-000000000002','jhaz-b@example.test',now()),('10000000-0000-4000-a000-000000000003','jhaz-c@example.test',now());
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-a000-000000000001',true);
select public.create_wedding('Extensions A') as wa \gset
select public.invite_partner('jhaz-b@example.test') as token \gset
select id as ceremony from public.ceremonies where wedding_id=:'wa' limit 1 \gset
insert into public.trousseau_categories(wedding_id,name) values(:'wa','Linge') returning id as category \gset
insert into public.trousseau_items(wedding_id,category_id,name,quantity,unit_minor) values(:'wa',:'category','Draps',2,10000) returning id as item \gset
select public.engage_trousseau(:'item',:'ceremony') as expense \gset
select public.engage_trousseau(:'item',:'ceremony') as again \gset
insert into public.moodboards(wedding_id,name) values(:'wa','Nos idées') returning id as board \gset
insert into public.inspirations(wedding_id,name,moodboard_id) values(:'wa','Makeup',:'board') returning id as idea \gset
insert into public.attachments(wedding_id,inspiration_id,path,caption) values(:'wa',:'idea',:'wa'||'/inspiration/photo.webp','Photo idée');
insert into public.attachments(wedding_id,trousseau_item_id,path,caption) values(:'wa',:'item',:'wa'||'/trousseau_item/photo.webp','Photo draps');
insert into storage.objects(bucket_id,name) values('wedding-photos',:'wa'||'/inspiration/photo.webp'),('wedding-photos',:'wa'||'/trousseau_item/photo.webp');
select public.save_timeline_event(jsonb_build_object('ceremony_id',:'ceremony','title','Entrée','start_minute',1140,'end_minute',1170,'description','PRIVATE','position',0),array[]::uuid[]) as event \gset
select set_config('test.wa',:'wa',true),set_config('test.item',:'item',true),set_config('test.expense',:'expense',true),set_config('test.again',:'again',true),set_config('test.idea',:'idea',true),set_config('test.board',:'board',true),set_config('test.event',:'event',true),set_config('test.ceremony',:'ceremony',true);
do $$begin
 if current_setting('test.expense')<>current_setting('test.again') or (select count(*) from public.expenses)<>1 or (select amount_minor from public.expenses limit 1)<>20000 then raise exception 'FAIL budget duplicate';end if;
 if (select count(*) from public.categories where kind in ('makeup','hair','vehicle'))<>3 then raise exception 'FAIL default service categories';end if;
 update public.trousseau_items set status='Préparé',notes='Modifié' where id=current_setting('test.item')::uuid;
 if not exists(select 1 from public.trousseau_items where notes='Modifié') then raise exception 'FAIL edit';end if;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-a000-000000000002',true);
select public.accept_invitation(:'token');
insert into public.inspiration_comments(wedding_id,inspiration_id,user_id,body) values(:'wa',:'idea',auth.uid(),'Avis de B');
do $$begin
 if (select count(*) from storage.objects)<>2 or (select count(*) from public.attachments)<>2 or (select count(*) from public.trousseau_items)<>1 or (select count(*) from public.timeline_events)<>1 then raise exception 'FAIL partner cannot access shared media/data';end if;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-a000-000000000003',true);
select public.create_wedding('Extensions C') as wc \gset
insert into public.trousseau_categories(wedding_id,name) values(:'wc','Autre') returning id as foreign_category \gset
select set_config('test.foreign_category',:'foreign_category',true);
do $$declare t text;n integer;begin
 foreach t in array array['trousseau_items','trousseau_sets','moodboards','inspiration_comments','timeline_events','timeline_event_providers','attachments'] loop execute format('select count(*) from public.%I',t) into n;if n<>0 then raise exception 'FAIL isolation %',t;end if;end loop;
 if (select count(*) from storage.objects)<>0 then raise exception 'FAIL stranger reads media';end if;
 begin perform private.seed_extension_categories(current_setting('test.wa')::uuid);raise exception 'FAIL private seed callable';exception when insufficient_privilege then null;end;
 begin insert into public.trousseau_items(wedding_id,category_id,name) values(current_setting('test.wa')::uuid,current_setting('test.foreign_category')::uuid,'Intrusion');raise exception 'FAIL cross insert accepted';exception when insufficient_privilege then null;end;
 begin perform public.engage_trousseau(current_setting('test.item')::uuid,(select id from public.ceremonies limit 1));raise exception 'FAIL foreign RPC accepted';exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-a000-000000000001',true);
do $$declare n integer;begin
 update public.inspiration_comments set body='Overwritten';get diagnostics n=row_count;if n<>0 then raise exception 'FAIL other author comment changed';end if;
 begin update public.trousseau_items set category_id=current_setting('test.foreign_category')::uuid where id=current_setting('test.item')::uuid;raise exception 'FAIL cross wedding FK accepted';exception when foreign_key_violation then null;end;
 begin insert into public.trousseau_items(wedding_id,category_id,name,expense_id) select wedding_id,category_id,'Duplicate invoice',expense_id from public.trousseau_items limit 1;raise exception 'FAIL duplicate expense linkage accepted';exception when unique_violation then null;end;
 perform public.reorder_moodboard(current_setting('test.board')::uuid,array[current_setting('test.idea')::uuid]);
 perform public.reorder_timeline(current_setting('test.ceremony')::uuid,array[current_setting('test.event')::uuid]);
 begin perform public.reorder_timeline(current_setting('test.ceremony')::uuid,array[]::uuid[]);raise exception 'FAIL partial reorder accepted';exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
 delete from public.attachments;delete from public.inspirations where id=current_setting('test.idea')::uuid;
 if (select count(*) from public.inspiration_comments)<>0 then raise exception 'FAIL comment cascade';end if;
 delete from public.trousseau_items where id=current_setting('test.item')::uuid;
 if (select count(*) from public.expenses)<>1 then raise exception 'FAIL item deletion removed expense';end if;
 delete from public.timeline_events where id=current_setting('test.event')::uuid;
 delete from public.moodboards where id=current_setting('test.board')::uuid;
end$$;
rollback;
\echo 'PASS extensions: CRUD, shared private media, isolation, comments, idempotent budget, unique expense, ordering, categories'
