-- Public bucket for listing photos: anyone can view, authenticated wallets upload.
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

create policy "listing photos are public"
  on storage.objects for select
  using (bucket_id = 'listing-photos');

create policy "authenticated wallets can upload listing photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos');

create policy "wallets can update their own listing photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'listing-photos' and owner = auth.uid());

create policy "wallets can delete their own listing photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and owner = auth.uid());
