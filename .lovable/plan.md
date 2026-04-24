
# Asset Management Module — Ideas 195–210

## Phase 1: Database Migration
Create tables for all 16 features in a single migration:
- `asset_meter_readings` — odometer, hour meter, cycle count, validation, abnormal jump alerts
- `asset_reservations` — calendar bookings, conflict detection, approval, project linkage
- `asset_incidents` — damage register, severity, root cause, corrective action, closure workflow
- `asset_overhauls` — refurbishment scope, budget, downtime, part tracking, life extension
- `asset_budget_plans` / `asset_budget_lines` — capex planning by year/branch/dept/category
- `asset_replacement_scores` — recommendation engine scores (age, utilization, cost, risk)
- `asset_it_packs` / `asset_it_pack_items` — onboarding bundles, issuance, return tracking
- `asset_hierarchy` — parent-child relationships on existing equipment table (parent_asset_id column)
- `asset_locations` — geolocation, coordinates, zone, movement history
- `asset_rental_contracts` / `asset_rental_billing` — rental-out billing, utilization, profitability
- `asset_leases` — borrowed/leased register, provider, terms, charges
- `asset_audit_plans` / `asset_audit_counts` — physical count workflow, variance, recount
- `asset_documents` — document library with version control
- `asset_downtime_events` — classified downtime reasons, failure types
- `asset_vendor_scorecards` / `asset_vendor_reviews` — service vendor performance
- Add `parent_asset_id` column to `cpms_equipment` for hierarchy

## Phase 2: Meter & Runtime Reading Management (Idea 195)
- Page: `src/pages/assets/MeterReadingsPage.tsx`
- Manual entry form with odometer/hours/cycles, validation rules
- Abnormal jump detection alerts, maintenance trigger integration
- Trend chart dashboard per asset

## Phase 3: Asset Reservation Calendar (Idea 196)
- Page: `src/pages/assets/AssetReservationCalendar.tsx`
- Calendar view with availability, conflict detection
- Reservation request form with approval workflow, project linkage

## Phase 4: Asset Incident & Damage Register (Idea 197)
- Page: `src/pages/assets/AssetIncidentRegister.tsx`
- Event logging with severity, responsible party, repair estimate
- Insurance linkage, root cause, corrective action, closure workflow

## Phase 5: Refurbishment & Major Overhaul (Idea 198)
- Page: `src/pages/assets/AssetOverhaulPage.tsx`
- Scope definition, budget approval, downtime planning
- Part replacement tracking, cost capture, post-overhaul comparison

## Phase 6: Asset Budget Planning (Idea 199)
- Page: `src/pages/assets/AssetBudgetPlanning.tsx`
- Acquisition, renewal, replacement, maintenance budgets
- Forecast vs actual by year/branch/department/category

## Phase 7: Asset Replacement Recommendation Engine (Idea 200)
- Page: `src/pages/assets/AssetReplacementEngine.tsx`
- Scoring: age, utilization, maintenance cost, downtime, safety, warranty, residual value
- Recommendations: repair, retain, refurbish, or replace

## Phase 8: Employee IT Asset Issuance Pack (Idea 201)
- Page: `src/pages/assets/ITAssetIssuance.tsx`
- Bundle creation, onboarding issuance, employee acknowledgment
- Offboarding return workflow

## Phase 9: Asset Hierarchy (Idea 202)
- Page: `src/pages/assets/AssetHierarchy.tsx`
- Tree view of parent-child relationships
- Inherited maintenance context, component history

## Phase 10: Geolocation & Site Mapping (Idea 203)
- Page: `src/pages/assets/AssetGeoMap.tsx`
- Leaflet map view with asset markers
- Zone assignment, movement history, last known location

## Phase 11: Rental Asset Billing (Idea 204)
- Page: `src/pages/assets/RentalAssetBilling.tsx`
- Rental contracts, rates, billing triggers, profitability analysis

## Phase 12: Borrowed & Leased Asset Register (Idea 205)
- Page: `src/pages/assets/LeasedAssetRegister.tsx`
- External leases/rentals, provider details, charges, usage history

## Phase 13: Fixed Asset Audit & Count (Idea 206)
- Page: `src/pages/assets/AssetAuditCount.tsx`
- Audit plans, assigned counters, scan verification, variance resolution

## Phase 14: Asset Document Library (Idea 207)
- Page: `src/pages/assets/AssetDocumentLibrary.tsx`
- Manuals, certificates, invoices, photos, version-controlled attachments

## Phase 15: Asset Downtime Reason Analytics (Idea 208)
- Page: `src/pages/assets/DowntimeAnalytics.tsx`
- Classified downtime by failure type, trend dashboards

## Phase 16: Asset Service Vendor Scorecard (Idea 209)
- Page: `src/pages/assets/VendorScorecard.tsx`
- Response time, repair quality, SLA compliance, user feedback

## Phase 17: Asset Executive Control Tower (Idea 210)
- Page: `src/pages/assets/AssetControlTower.tsx`
- Executive dashboard: acquisition trends, utilization, downtime, maintenance backlog, warranty/insurance exposure, aging, replacement pipeline, capital plan variance

## Phase 18: Routing & Sidebar
- Register all 16 new pages in App.tsx
- Add Asset Management section to Sidebar with all sub-items
- Add translation keys to LanguageContext

**Approach**: Reuse existing `cpms_equipment` infrastructure. All pages use the enterprise UI design system (navy sidebar, IBM Plex Sans, #0066cc accents). Full database integration with RLS policies.
