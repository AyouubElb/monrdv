-- Three businesses for local development, one per kind, so `atlas.localhost`, `anfa.localhost`,
-- and `karim.localhost` resolve with staff, hours, services, time off, and bookings.
-- Each business has one owner who signs in with the password `Dev-Owner-2026!` on its own subdomain.
-- Runs as app_migrator (the table owner, so row level security does not apply).
-- Safe to run again: deleting the three businesses cascades through every table.
-- The demo data feature (scope feature 14) replaces it.
DELETE FROM businesses WHERE subdomain IN ('atlas', 'anfa', 'karim');

DO $$
DECLARE
  -- Wall clock dates: what the businesses' clock shows (spec 0003, "Two kinds of time").
  this_monday date := date_trunc('week', now() AT TIME ZONE 'Africa/Casablanca')::date;
  next_monday date := this_monday + 7;
  last_thursday date := this_monday - 4;
  -- argon2id of `Dev-Owner-2026!` with the spec 0001 parameters, computed once.
  owner_hash text := '$argon2id$v=19$m=19456,p=1,t=2$LfoVFdSz8pXjaU4cN4VuYA$YReGrm/mypAisQkrFu5R3JYByZpPiIgJhpHKiSmYdSY';
  owner_user uuid;
  atlas uuid;
  anfa uuid;
  karim uuid;
  samira uuid;
  youssef uuid;
  doctor uuid;
  coach uuid;
  coupe_femme uuid;
  brushing uuid;
  coupe_homme uuid;
  consultation uuid;
  seance uuid;
  paid_booking uuid;
BEGIN
  -- Salon Atlas: two hairdressers with different weeks, a vacation, and a closure.
  INSERT INTO businesses (subdomain, name, kind, phone, accent_color)
  VALUES ('atlas', 'Salon Atlas', 'salon', '+212522000001', '#ab4a28')
  RETURNING id INTO atlas;

  INSERT INTO users (business_id, email, password_hash)
  VALUES (atlas, 'samira@atlas.test', owner_hash) RETURNING id INTO owner_user;
  INSERT INTO staff (business_id, name, user_id) VALUES (atlas, 'Samira', owner_user) RETURNING id INTO samira;
  INSERT INTO staff (business_id, name) VALUES (atlas, 'Youssef') RETURNING id INTO youssef;

  INSERT INTO services (business_id, name, duration_minutes, price_centimes)
  VALUES (atlas, 'Coupe femme', 45, 12000) RETURNING id INTO coupe_femme;
  INSERT INTO services (business_id, name, duration_minutes, price_centimes)
  VALUES (atlas, 'Brushing', 30, 8000) RETURNING id INTO brushing;
  INSERT INTO services (business_id, name, duration_minutes, price_centimes)
  VALUES (atlas, 'Coupe homme', 30, 7000) RETURNING id INTO coupe_homme;

  INSERT INTO staff_services (business_id, staff_id, service_id) VALUES
    (atlas, samira, coupe_femme),
    (atlas, samira, brushing),
    (atlas, youssef, coupe_homme),
    (atlas, youssef, brushing);

  -- Samira Monday to Friday 9:00 to 17:00; Youssef Tuesday to Saturday 12:00 to 20:00.
  INSERT INTO weekly_hours (business_id, staff_id, weekday, start_minute, end_minute)
  SELECT atlas, samira, d, 540, 1020 FROM generate_series(1, 5) AS d;
  INSERT INTO weekly_hours (business_id, staff_id, weekday, start_minute, end_minute)
  SELECT atlas, youssef, d, 720, 1200 FROM generate_series(2, 6) AS d;

  INSERT INTO time_off (business_id, staff_id, starts_at, ends_at, label) VALUES
    (atlas, samira, '2027-08-10 00:00', '2027-08-16 00:00', 'Congés'),
    (atlas, NULL, '2027-03-10 00:00', '2027-03-12 00:00', 'Aïd al-Fitr');

  -- Last Thursday, done and paid in cash; then the coming week (two back to back for Samira).
  INSERT INTO bookings (business_id, code, staff_id, service_id, starts_at, ends_at, status,
                        customer_name, customer_phone, customer_email, consented_at)
  VALUES (atlas, 'ATL-7K3Q', samira, coupe_femme,
          last_thursday + time '11:00', last_thursday + time '11:45', 'done',
          'Salma Bennani', '+212612345678', 'salma.bennani@example.ma', now() - interval '10 days')
  RETURNING id INTO paid_booking;

  INSERT INTO payments (business_id, booking_id, amount_centimes, method, paid_at)
  VALUES (atlas, paid_booking, 12000, 'cash',
          (last_thursday + time '11:45') AT TIME ZONE 'Africa/Casablanca');

  INSERT INTO bookings (business_id, code, staff_id, service_id, starts_at, ends_at,
                        customer_name, customer_phone, customer_email, consented_at)
  VALUES
    (atlas, 'ATL-M4XP', samira, coupe_femme,
     next_monday + time '10:00', next_monday + time '10:45',
     'Nadia El Idrissi', '+212661234567', 'nadia.elidrissi@example.ma', now()),
    (atlas, 'ATL-9HDR', samira, brushing,
     next_monday + time '10:45', next_monday + time '11:15',
     'Salma Bennani', '+212612345678', 'salma.bennani@example.ma', now()),
    (atlas, 'ATL-2WCN', youssef, coupe_homme,
     next_monday + 1 + time '15:00', next_monday + 1 + time '15:30',
     'Omar Tazi', '+212700112233', 'omar.tazi@example.ma', now());

  -- Clinique Anfa: one doctor with two ranges a day.
  INSERT INTO businesses (subdomain, name, kind, phone, accent_color)
  VALUES ('anfa', 'Clinique Anfa', 'clinic', '+212522000002', '#0f6e6e')
  RETURNING id INTO anfa;

  INSERT INTO users (business_id, email, password_hash)
  VALUES (anfa, 'amina@anfa.test', owner_hash) RETURNING id INTO owner_user;
  INSERT INTO staff (business_id, name, user_id)
  VALUES (anfa, 'Dr Amina Alaoui', owner_user) RETURNING id INTO doctor;
  INSERT INTO services (business_id, name, duration_minutes, price_centimes)
  VALUES (anfa, 'Consultation', 30, 30000) RETURNING id INTO consultation;
  INSERT INTO staff_services (business_id, staff_id, service_id) VALUES (anfa, doctor, consultation);

  -- Monday to Friday 9:00 to 13:00 and 15:00 to 19:00.
  INSERT INTO weekly_hours (business_id, staff_id, weekday, start_minute, end_minute)
  SELECT anfa, doctor, d, r.start_minute, r.end_minute
  FROM generate_series(1, 5) AS d, (VALUES (540, 780), (900, 1140)) AS r (start_minute, end_minute);

  INSERT INTO bookings (business_id, code, staff_id, service_id, starts_at, ends_at,
                        customer_name, customer_phone, customer_email, consented_at)
  VALUES (anfa, 'ANF-5TBV', doctor, consultation,
          next_monday + 2 + time '09:30', next_monday + 2 + time '10:00',
          'Youssef Chraibi', '+212650998877', 'y.chraibi@example.ma', now());

  -- Coach Karim: one person, two evenings a week. No accent color, so the page shows the default olive.
  INSERT INTO businesses (subdomain, name, kind)
  VALUES ('karim', 'Coach Karim', 'coach')
  RETURNING id INTO karim;

  INSERT INTO users (business_id, email, password_hash)
  VALUES (karim, 'karim@karim.test', owner_hash) RETURNING id INTO owner_user;
  INSERT INTO staff (business_id, name, user_id) VALUES (karim, 'Karim', owner_user) RETURNING id INTO coach;
  INSERT INTO services (business_id, name, duration_minutes, price_centimes)
  VALUES (karim, 'Séance de coaching', 60, 25000) RETURNING id INTO seance;
  INSERT INTO staff_services (business_id, staff_id, service_id) VALUES (karim, coach, seance);

  -- Monday and Wednesday 18:00 to 21:00.
  INSERT INTO weekly_hours (business_id, staff_id, weekday, start_minute, end_minute)
  VALUES (karim, coach, 1, 1080, 1260), (karim, coach, 3, 1080, 1260);

  INSERT INTO bookings (business_id, code, staff_id, service_id, starts_at, ends_at,
                        customer_name, customer_phone, customer_email, consented_at)
  VALUES (karim, 'KAR-8GJZ', coach, seance,
          next_monday + 2 + time '18:00', next_monday + 2 + time '19:00',
          'Leila Amrani', '+212677445566', 'leila.amrani@example.ma', now());
END $$;
