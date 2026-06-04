-- Временно: всем зарегистрированным — тариф «Про» по умолчанию.
-- (Когда появится оплата, дефолт вернём на 'free'.)

alter table public.profiles alter column plan set default 'pro';
update public.profiles set plan = 'pro';
