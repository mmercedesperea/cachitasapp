-- 003_seed_equipment.sql

insert into equipment (name, slug, category)
values
  ('Rack', 'rack', 'structure'),
  ('Barra olímpica', 'barra-olimpica', 'free_weights'),
  ('Discos', 'discos', 'free_weights'),
  ('Banco', 'banco', 'benches'),
  ('Máquina de poleas', 'maquina-de-poleas', 'cables'),
  ('Mancuernas', 'mancuernas', 'free_weights'),
  ('Kettlebells', 'kettlebells', 'free_weights'),
  ('Barra de dominadas', 'barra-de-dominadas', 'bodyweight'),
  ('Anillas', 'anillas', 'bodyweight'),
  ('Bandas', 'bandas', 'accessories'),
  ('Cajón', 'cajon', 'conditioning'),
  ('Elíptica', 'eliptica', 'cardio')
on conflict (slug) do nothing;
