-- ─────────────────────────────────────────────────────────────────
-- Seed 001 — Development Data
-- DO NOT run in production.
-- Populates the DB with BuildRight demo data matching the prototype.
-- ─────────────────────────────────────────────────────────────────

-- Insert demo firm
INSERT INTO firms (id, name, tin, vat_number, address, email)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'BuildRight & Associates',
  'C0012345678',
  'VAT/000/123456',
  'Ridge, Accra, Ghana',
  'accounts@buildright.gh'
) ON CONFLICT DO NOTHING;

-- Insert demo users (passwords are hashed 'password123' — dev only)
INSERT INTO users (id, firm_id, email, password_hash, full_name, role) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'ceo@buildright.gh',       '$2b$10$placeholder_hash_ceo', 'Kwame Asante',      'ceo'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'accounts@buildright.gh',  '$2b$10$placeholder_hash_acc', 'Efua Asante',       'accountant'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'kofi@buildright.gh',      '$2b$10$placeholder_hash_emp', 'Kofi Mensah',       'employee')
ON CONFLICT DO NOTHING;

-- Insert demo clients
INSERT INTO clients (id, firm_id, name, tin, is_vat_registered) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Ghana Highways Authority',   'C0099000001', TRUE),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Regimanuel Gray Ltd',        'C0099000002', TRUE),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Stanbic Bank Ghana',         'C0099000003', TRUE),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Accra Metropolitan Assembly', 'C0099000004', FALSE),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Total Energies Ghana',       'C0099000005', TRUE),
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Maersk Ghana',               'C0099000006', TRUE)
ON CONFLICT DO NOTHING;
