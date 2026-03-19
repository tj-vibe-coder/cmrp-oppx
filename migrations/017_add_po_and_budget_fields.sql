-- Migration 017: Add PO and Budget allocation fields for OP100 award tracking
-- These fields are populated when a project is awarded (OP100) and support
-- extraction from Calcsheet Excel files.

ALTER TABLE opps_monitoring ADD COLUMN po_number TEXT;
ALTER TABLE opps_monitoring ADD COLUMN po_date TEXT;
ALTER TABLE opps_monitoring ADD COLUMN budget_products REAL;
ALTER TABLE opps_monitoring ADD COLUMN budget_services REAL;
ALTER TABLE opps_monitoring ADD COLUMN budget_gen_req REAL;
