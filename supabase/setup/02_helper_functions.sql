-- Step 2: Create helper functions for RLS policies
-- Run this after enabling RLS on tables

-- Function to check if a user is an admin
create or replace function public.is_admin(user_id uuid)
returns boolean as $$
begin
  return exists(
    select 1 from public.profiles
    where id = user_id and role in ('admin', 'super_admin')
  );
end;
$$ language plpgsql security definer;

-- Function to check if a user is a super admin
create or replace function public.is_super_admin(user_id uuid)
returns boolean as $$
begin
  return exists(
    select 1 from public.profiles
    where id = user_id and role = 'super_admin'
  );
end;
$$ language plpgsql security definer;

-- Function to automatically create profile after user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user profile creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
