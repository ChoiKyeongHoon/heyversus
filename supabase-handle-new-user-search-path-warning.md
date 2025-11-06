# Supabase handle_new_user search_path warning

## What showed up
- Supabase Issue inspector: `Function public.handle_new_user has a role mutable search_path`
- Trigger function `public.handle_new_user` created as `SECURITY DEFINER`

## Why it happens
- When a PostgreSQL function uses `SECURITY DEFINER`, it runs with the owner's permissions.
- If the function omits `SET search_path`, a malicious session could change `search_path` and cause the function to run objects (tables, functions) from an unexpected schema.
- Supabase flags this as a security warning so you hardcode the safe schema list.

## Fix
Recreate the function with an explicit `search_path`:

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;
```

### Notes
- List only the schemas the function truly needs, e.g. `set search_path = public, auth`.
- Apply the same pattern to other `SECURITY DEFINER` functions that rely on `public` objects.
- After recreating the function, rerun `supabase db push` or execute the SQL in the Supabase SQL Editor, then refresh the Issues panel to confirm the warning is cleared.
