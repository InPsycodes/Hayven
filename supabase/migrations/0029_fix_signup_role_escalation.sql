-- Security fix: handle_new_user() cast raw_user_meta_data->>'role' straight
-- to the user_role enum with no validation, and src/lib/auth/actions.ts's
-- signUp() passed its `role` argument straight into that metadata unchecked.
-- The signup form UI only ever sends "parent"/"therapist", but that's just a
-- client-side constraint -- nothing stopped a direct call to Supabase Auth's
-- signUp with role: "admin" or role: "supervisor" from creating a real
-- privileged account, since the trigger runs security definer and blindly
-- trusts caller-supplied metadata. Same bug class as 0016/0021 (a
-- client-controlled field reaching a privileged column), this time via auth
-- metadata instead of a table grant.
--
-- There is no legitimate self-service path to an admin/supervisor account
-- anywhere in the app -- those roles are provisioned out-of-band by whoever
-- operates the platform. So the trigger, the real enforcement point, now
-- only ever accepts "parent"/"therapist" from signup metadata and silently
-- falls back to "parent" for anything else, matching its prior default
-- behaviour for a missing/invalid role.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, role, full_name, email, phone)
  values (
    new.id,
    case new.raw_user_meta_data->>'role'
      when 'therapist' then 'therapist'::user_role
      else 'parent'::user_role
    end,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;
