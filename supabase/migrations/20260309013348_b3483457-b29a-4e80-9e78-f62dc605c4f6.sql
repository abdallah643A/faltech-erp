
-- CPMS test data - full project cycle

-- 1. Projects
INSERT INTO cpms_projects (id, code, name, name_ar, type, classification, status, start_date, end_date, client_name, contract_value, revised_contract_value, currency, location, city, description) VALUES 
  ('a1b2c3d4-0001-4000-8000-000000000001', 'PRJ-2025-001', 'Al Rajhi Corporate Tower', 'برج الراجحي للأعمال', 'building', 'A', 'active', '2025-01-15', '2026-06-30', 'Al Rajhi Capital', 45000000, 47500000, 'SAR', 'King Fahd Road', 'Riyadh', '25-floor corporate tower'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'PRJ-2025-002', 'Jubail Industrial Complex', 'مجمع الجبيل الصناعي', 'infrastructure', 'B', 'active', '2025-03-01', '2026-12-31', 'SABIC', 28000000, null, 'SAR', 'Jubail Industrial City', 'Jubail', 'Steel plant with utilities'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'PRJ-2025-003', 'Jeddah Mall MEP Retrofit', 'تجديد أنظمة مول جدة', 'mep', 'B', 'planning', '2025-06-01', '2025-12-31', 'Cenomi Group', 8500000, null, 'SAR', 'Prince Sultan Road', 'Jeddah', 'HVAC and electrical upgrade'),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'PRJ-2024-010', 'Dammam Highway Extension', 'توسعة طريق الدمام', 'civil', 'A', 'completed', '2024-01-01', '2025-02-28', 'Ministry of Transport', 62000000, 64500000, 'SAR', 'Dammam-Khobar', 'Dammam', '12km highway extension');

-- 2. WBS
INSERT INTO cpms_wbs_nodes (project_id, code, name, level, type, sort_order, budget_amount, progress_pct, status) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', '01', 'Substructure', 1, 'phase', 1, 8000000, 95, 'in_progress'),
  ('a1b2c3d4-0001-4000-8000-000000000001', '01.01', 'Piling Works', 2, 'package', 2, 3500000, 100, 'completed'),
  ('a1b2c3d4-0001-4000-8000-000000000001', '01.02', 'Foundation & Raft', 2, 'package', 3, 4500000, 90, 'in_progress'),
  ('a1b2c3d4-0001-4000-8000-000000000001', '02', 'Superstructure', 1, 'phase', 4, 18000000, 45, 'in_progress'),
  ('a1b2c3d4-0001-4000-8000-000000000001', '02.01', 'Concrete Frame (B1-10F)', 2, 'package', 5, 10000000, 60, 'in_progress'),
  ('a1b2c3d4-0001-4000-8000-000000000001', '02.02', 'Concrete Frame (11F-25F)', 2, 'package', 6, 8000000, 25, 'in_progress'),
  ('a1b2c3d4-0001-4000-8000-000000000001', '03', 'MEP Systems', 1, 'phase', 7, 12000000, 15, 'in_progress'),
  ('a1b2c3d4-0001-4000-8000-000000000001', '04', 'Finishing & Facades', 1, 'phase', 8, 7000000, 0, 'pending'),
  ('a1b2c3d4-0002-4000-8000-000000000002', '01', 'Site Preparation', 1, 'phase', 1, 4000000, 100, 'completed'),
  ('a1b2c3d4-0002-4000-8000-000000000002', '02', 'Steel Structure', 1, 'phase', 2, 12000000, 70, 'in_progress'),
  ('a1b2c3d4-0002-4000-8000-000000000002', '03', 'Utilities & Piping', 1, 'phase', 3, 8000000, 30, 'in_progress'),
  ('a1b2c3d4-0002-4000-8000-000000000002', '04', 'Testing & Commissioning', 1, 'phase', 4, 4000000, 0, 'pending');

-- 3. Daily Reports
INSERT INTO cpms_daily_reports (project_id, report_date, weather, temperature_high, temperature_low, manpower_count, equipment_count, work_summary, safety_observations, incidents_count, status, site_engineer_name) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', '2025-12-01', 'sunny', 32, 18, 245, 42, 'Concrete pouring floors 14-15.', 'All PPE compliant.', 0, 'approved', 'Ahmed Al-Saud'),
  ('a1b2c3d4-0001-4000-8000-000000000001', '2025-12-02', 'cloudy', 28, 16, 238, 40, 'MEP rough-in floors 8-10.', 'Near miss zone B.', 1, 'approved', 'Ahmed Al-Saud'),
  ('a1b2c3d4-0001-4000-8000-000000000001', '2025-12-03', 'sunny', 30, 17, 252, 44, 'Floor 15 pour completed.', 'HSE audit passed.', 0, 'submitted', 'Ahmed Al-Saud'),
  ('a1b2c3d4-0002-4000-8000-000000000002', '2025-12-01', 'windy', 35, 22, 180, 28, 'Steel erection bay 4-6.', 'Wind monitoring.', 0, 'approved', 'Khalid Ibrahim'),
  ('a1b2c3d4-0002-4000-8000-000000000002', '2025-12-02', 'sunny', 38, 24, 185, 30, 'Fire protection bays 1-3.', 'Heat precautions.', 0, 'approved', 'Khalid Ibrahim');

-- 4. RFIs
INSERT INTO cpms_rfis (project_id, rfi_number, subject, description, discipline, priority, status, raised_by_name, raised_date, due_date) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'RFI-001', 'Foundation depth at grid G7', 'Rock at -8m vs -12m.', 'structural', 'urgent', 'open', 'Ahmed Al-Saud', '2025-11-28', '2025-12-05'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'RFI-002', 'HVAC duct conflict floor 12', 'MEP clash at grid D4-D6.', 'mep', 'high', 'submitted', 'Yousef Nasser', '2025-11-25', '2025-12-02'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'RFI-003', 'Facade material approval', 'Alt aluminum panel.', 'architectural', 'normal', 'responded', 'Mohammed Faisal', '2025-11-20', '2025-12-10'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'RFI-001', 'Steel grade substitution', 'S355J2 vs S275JR.', 'structural', 'high', 'open', 'Khalid Ibrahim', '2025-12-01', '2025-12-08');

-- 5. Submittals
INSERT INTO cpms_submittals (project_id, submittal_number, title, type, discipline, review_status, revision, submitted_date) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'SUB-001', 'Steel Shop Drawings', 'shop_drawing', 'structural', 'approved', 2, '2025-11-15'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'SUB-002', 'HVAC Chillers', 'material', 'mechanical', 'pending', 1, '2025-11-28'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'SUB-003', 'Curtain Wall Mock-up', 'test_report', 'architectural', 'approved', 1, '2025-11-10'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'SUB-001', 'Welding Procedure', 'method_statement', 'structural', 'approved', 3, '2025-10-20');

-- 6. NCRs
INSERT INTO cpms_ncrs (project_id, ncr_number, title, description, severity, status, raised_by_name, raised_date, cost_impact) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'NCR-001', 'Concrete cube test failure', '27 MPa vs 40 MPa.', 'critical', 'open', 'Quality Team', '2025-11-22', 250000),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'NCR-002', 'Rebar spacing non-conformance', '200mm vs 150mm.', 'major', 'under_review', 'Ahmed Al-Saud', '2025-11-25', 85000),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'NCR-001', 'Welding defect primary beam', 'Incomplete fusion bay 3.', 'major', 'open', 'QA Inspector', '2025-12-01', 120000);

-- 7. HSE Incidents
INSERT INTO cpms_hse_incidents (project_id, type, severity, description, location, status, incident_date) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'near_miss', 'medium', 'Tool fell from scaffolding floor 12.', 'Zone B', 'investigating', '2025-12-02'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'first_aid', 'low', 'Minor hand cut during rebar tying.', 'Foundation', 'closed', '2025-11-28'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'near_miss', 'high', 'Crane overload during erection.', 'Bay 5', 'open', '2025-12-01'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'lost_time', 'high', 'Heat exhaustion. 2 days lost.', 'Pipe Rack', 'closed', '2025-11-15');

-- 8. Budgets
INSERT INTO cpms_budgets (project_id, name, version, total_value, contingency_pct, status) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Master Budget', 1, 45000000, 5, 'approved'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Revised Budget', 2, 47500000, 7, 'approved'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Master Budget', 1, 28000000, 8, 'approved');

-- 9. Commitments
INSERT INTO cpms_commitments (project_id, ref_number, type, vendor_name, committed_amount, invoiced_amount, remaining_amount, status) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'PO-101', 'subcontract', 'Saudi Ready Mix', 12000000, 8500000, 3500000, 'active'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'PO-102', 'purchase_order', 'Riyadh Steel', 6500000, 4200000, 2300000, 'active'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'PO-103', 'subcontract', 'Gulf MEP', 9800000, 1500000, 8300000, 'active'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'PO-201', 'subcontract', 'Al Zamil Steel', 14000000, 9800000, 4200000, 'active'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'PO-202', 'purchase_order', 'SABIC Pipes', 5500000, 2200000, 3300000, 'active');

-- 10. IPAs
INSERT INTO cpms_ipas (project_id, ipa_no, period_from, period_to, gross_amount, retention_amount, net_amount, certified_amount, status) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'IPA-001', '2025-01-01', '2025-03-31', 8500000, 850000, 7650000, 7650000, 'paid'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'IPA-002', '2025-04-01', '2025-06-30', 9200000, 920000, 8280000, 8280000, 'paid'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'IPA-003', '2025-07-01', '2025-09-30', 7800000, 780000, 7020000, 7020000, 'certified'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'IPA-004', '2025-10-01', '2025-12-31', 6500000, 650000, 5850000, 0, 'submitted'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'IPA-001', '2025-03-01', '2025-06-30', 7000000, 700000, 6300000, 6300000, 'paid'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'IPA-002', '2025-07-01', '2025-09-30', 8500000, 850000, 7650000, 7650000, 'certified');

-- 11. Retention
INSERT INTO cpms_retention_ledger (project_id, transaction_type, amount, description) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'retained', 850000, 'IPA-001 retention'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'retained', 920000, 'IPA-002 retention'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'retained', 780000, 'IPA-003 retention'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'retained', 700000, 'IPA-001 retention'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'retained', 850000, 'IPA-002 retention');

-- 12. Revenue Recognition (period is date)
INSERT INTO cpms_revenue_recognition (project_id, period, method, completion_pct, recognized_revenue, deferred_revenue, cumulative_revenue) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', '2025-03-31', 'percentage_of_completion', 18, 8550000, 36450000, 8550000),
  ('a1b2c3d4-0001-4000-8000-000000000001', '2025-06-30', 'percentage_of_completion', 38, 9500000, 26950000, 18050000),
  ('a1b2c3d4-0001-4000-8000-000000000001', '2025-09-30', 'percentage_of_completion', 55, 8075000, 18875000, 26125000),
  ('a1b2c3d4-0001-4000-8000-000000000001', '2025-12-31', 'percentage_of_completion', 68, 6175000, 12700000, 32300000),
  ('a1b2c3d4-0002-4000-8000-000000000002', '2025-06-30', 'percentage_of_completion', 15, 4200000, 23800000, 4200000),
  ('a1b2c3d4-0002-4000-8000-000000000002', '2025-09-30', 'percentage_of_completion', 40, 7000000, 16800000, 11200000);

-- 13. EVM Snapshots
INSERT INTO cpms_evm_snapshots (project_id, snapshot_date, bcws, bcwp, acwp, spi, cpi, eac, vac) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', '2025-09-30', 26000000, 24500000, 23800000, 0.94, 1.03, 46116505, 1383495),
  ('a1b2c3d4-0001-4000-8000-000000000001', '2025-10-31', 29000000, 27200000, 26500000, 0.94, 1.03, 46116505, 1383495),
  ('a1b2c3d4-0001-4000-8000-000000000001', '2025-11-30', 32000000, 30400000, 29800000, 0.95, 1.02, 46568627, 931373),
  ('a1b2c3d4-0002-4000-8000-000000000002', '2025-09-30', 11200000, 10500000, 11800000, 0.94, 0.89, 31460674, -3460674),
  ('a1b2c3d4-0002-4000-8000-000000000002', '2025-11-30', 14000000, 13200000, 14500000, 0.94, 0.91, 30769231, -2769231);

-- 14. Contracts
INSERT INTO cpms_contracts (project_id, contract_no, type, value, retention_pct, status) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'MC-001', 'main', 45000000, 10, 'active'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'SC-001', 'subcontract', 12000000, 5, 'active'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'SC-002', 'subcontract', 9800000, 5, 'active'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'MC-002', 'main', 28000000, 10, 'active');

-- 15. Documents
INSERT INTO cpms_documents (project_id, doc_no, title, type, discipline, current_revision, status) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'DWG-STR-001', 'Foundation Plan', 'drawing', 'structural', 'C', 'approved'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'DWG-STR-002', 'Typical Floor Plan', 'drawing', 'structural', 'B', 'approved'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'DWG-MEP-001', 'HVAC Layout', 'drawing', 'mechanical', 'A', 'under_review'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'DWG-STR-001', 'Steel Framing Plan', 'drawing', 'structural', 'D', 'approved');
