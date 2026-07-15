-- Permite eliminar definitivamente una cotización junto con todos los
-- registros que dependen de ella (contratos, riders, pagos y cualquier
-- otra tabla que tenga una FK directa hacia public.cotizaciones).
--
-- La aplicación muestra una confirmación explícita antes de ejecutar el
-- borrado y limpia después los PDF correspondientes en Supabase Storage.

do $$
declare
  fk record;
  child_columns text;
  parent_columns text;
  match_clause text;
  update_clause text;
  deferrable_clause text;
  validated_clause text;
begin
  for fk in
    select
      c.oid,
      c.conname,
      c.conrelid,
      c.confrelid,
      c.conkey,
      c.confkey,
      c.confmatchtype,
      c.confupdtype,
      c.confdeltype,
      c.condeferrable,
      c.condeferred,
      c.convalidated
    from pg_constraint c
    where c.contype = 'f'
      and c.confrelid = 'public.cotizaciones'::regclass
      and c.confdeltype <> 'c'
  loop
    select string_agg(format('%I', a.attname), ', ' order by k.ord)
      into child_columns
    from unnest(fk.conkey) with ordinality as k(attnum, ord)
    join pg_attribute a
      on a.attrelid = fk.conrelid
     and a.attnum = k.attnum;

    select string_agg(format('%I', a.attname), ', ' order by k.ord)
      into parent_columns
    from unnest(fk.confkey) with ordinality as k(attnum, ord)
    join pg_attribute a
      on a.attrelid = fk.confrelid
     and a.attnum = k.attnum;

    match_clause := case fk.confmatchtype
      when 'f' then ' MATCH FULL'
      when 'p' then ' MATCH PARTIAL'
      else ''
    end;

    update_clause := case fk.confupdtype
      when 'r' then ' ON UPDATE RESTRICT'
      when 'c' then ' ON UPDATE CASCADE'
      when 'n' then ' ON UPDATE SET NULL'
      when 'd' then ' ON UPDATE SET DEFAULT'
      else ''
    end;

    deferrable_clause := case
      when fk.condeferrable and fk.condeferred
        then ' DEFERRABLE INITIALLY DEFERRED'
      when fk.condeferrable
        then ' DEFERRABLE INITIALLY IMMEDIATE'
      else ''
    end;

    validated_clause := case
      when fk.convalidated then ''
      else ' NOT VALID'
    end;

    execute format(
      'alter table %s drop constraint %I',
      fk.conrelid::regclass,
      fk.conname
    );

    execute format(
      'alter table %s add constraint %I foreign key (%s) references %s (%s)%s%s on delete cascade%s%s',
      fk.conrelid::regclass,
      fk.conname,
      child_columns,
      fk.confrelid::regclass,
      parent_columns,
      match_clause,
      update_clause,
      deferrable_clause,
      validated_clause
    );
  end loop;
end
$$;
