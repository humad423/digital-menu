-- Customers no longer have accounts, and reviews will be rebuilt from scratch if they return.
delete from public.profiles where role = 'customer';
drop table if exists public.ratings;
