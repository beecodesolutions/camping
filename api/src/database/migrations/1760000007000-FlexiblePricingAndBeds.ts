import type { MigrationInterface, QueryRunner } from 'typeorm'

export class FlexiblePricingAndBeds1760000007000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`SET LOCAL search_path TO camping_private, public`)
    await q.query(
      `ALTER TABLE campings ADD COLUMN infants_consume_capacity boolean NOT NULL DEFAULT false`,
    )
    await q.query(`ALTER TABLE accommodation_types
      ADD COLUMN pricing jsonb,
      DROP CONSTRAINT accommodation_types_inventory_mode_check,
      DROP CONSTRAINT accommodation_types_occupancy_shape,
      ADD CONSTRAINT accommodation_types_inventory_mode_check CHECK (inventory_mode IN ('individual','unlimited','shared')),
      ADD CONSTRAINT accommodation_types_occupancy_shape CHECK ((inventory_mode = 'unlimited' AND max_occupancy IS NULL) OR (inventory_mode IN ('individual','shared') AND max_occupancy IS NOT NULL AND max_occupancy >= 1)),
      ADD CONSTRAINT accommodation_types_pricing_shape CHECK (pricing IS NULL OR (jsonb_typeof(pricing) = 'object' AND pricing->>'basis' IN ('per_unit','per_person','per_bed'))),
      ADD CONSTRAINT accommodation_types_pricing_basis CHECK (CASE WHEN inventory_mode = 'shared' THEN pricing IS NOT NULL AND pricing->>'basis' = 'per_bed' ELSE pricing IS NULL OR pricing->>'basis' <> 'per_bed' END)`)
    for (const table of ['reservations', 'stays']) {
      await q.query(
        `ALTER TABLE ${table} ADD COLUMN pets integer NOT NULL DEFAULT 0 CHECK (pets >= 0)`,
      )
      // Retain every original snapshot check, extending only the accepted basis.
      const rows = (await q.query(
        `SELECT conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid = $1::regclass AND contype = 'c' AND conname LIKE '%price_snapshot_shape'`,
        [table],
      )) as { conname: string; definition: string }[]
      for (const row of rows) {
        const definition = row.definition
          .replaceAll(
            "ARRAY['per_unit'::text, 'per_person'::text]",
            "ARRAY['per_unit'::text, 'per_person'::text, 'per_bed'::text]",
          )
          .replaceAll(
            "= 'per_unit'::text",
            "= ANY (ARRAY['per_unit'::text, 'per_bed'::text])",
          )
        await q.query(
          `ALTER TABLE ${table} DROP CONSTRAINT ${row.conname}, ADD CONSTRAINT ${row.conname} ${definition}`,
        )
      }
    }
    await q.query(
      `ALTER TABLE reservations ADD COLUMN capacity_override_reason text`,
    )
    await q.query(`CREATE OR REPLACE FUNCTION validate_reservation_accommodation_unit() RETURNS trigger LANGUAGE plpgsql SET search_path TO camping_private, public AS $$
      DECLARE type_mode varchar(16);
      BEGIN
        SELECT inventory_mode INTO type_mode FROM accommodation_types WHERE camping_id = NEW.camping_id AND id = NEW.accommodation_type_id;
        IF type_mode IN ('individual','shared') AND NEW.unit_id IS NULL THEN RAISE EXCEPTION 'Accommodation requires a unit'; END IF;
        IF type_mode = 'unlimited' AND NEW.unit_id IS NOT NULL THEN RAISE EXCEPTION 'Unlimited accommodation cannot specify a unit'; END IF;
        RETURN NEW;
      END; $$`)
    await q.query(`CREATE TABLE accommodation_beds (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), camping_id uuid NOT NULL,
      unit_id uuid NOT NULL, name varchar(200) NOT NULL CHECK (length(btrim(name)) > 0),
      position integer NOT NULL DEFAULT 0 CHECK (position >= 0), enabled boolean NOT NULL DEFAULT true,
      UNIQUE(camping_id,id), UNIQUE(camping_id,unit_id,id), UNIQUE(camping_id,unit_id,name),
      FOREIGN KEY(camping_id,unit_id) REFERENCES accommodation_units(camping_id,id) ON DELETE RESTRICT
    )`)
    await q.query(
      `ALTER TABLE reservations ADD CONSTRAINT uq_reservations_camping_unit UNIQUE(camping_id,id,unit_id)`,
    )
    await q.query(`CREATE TABLE reservation_beds (
      camping_id uuid NOT NULL, reservation_id uuid NOT NULL, unit_id uuid NOT NULL, bed_id uuid NOT NULL,
      PRIMARY KEY(camping_id,reservation_id,bed_id),
      FOREIGN KEY(camping_id,reservation_id,unit_id) REFERENCES reservations(camping_id,id,unit_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
      FOREIGN KEY(camping_id,unit_id,bed_id) REFERENCES accommodation_beds(camping_id,unit_id,id) ON DELETE RESTRICT
    )`)
    await q.query(`CREATE TABLE bed_occupancy (
      camping_id uuid NOT NULL, reservation_id uuid NOT NULL, bed_id uuid NOT NULL, night date NOT NULL,
      PRIMARY KEY(camping_id,bed_id,night),
      FOREIGN KEY(camping_id,reservation_id,bed_id) REFERENCES reservation_beds(camping_id,reservation_id,bed_id) ON DELETE CASCADE
    )`)
    await q.query(
      `CREATE INDEX bed_occupancy_reservation ON bed_occupancy(camping_id,reservation_id)`,
    )
    await q.query(`CREATE FUNCTION release_reservation_beds() RETURNS trigger LANGUAGE plpgsql SET search_path TO camping_private, public AS $$
      BEGIN
        IF NEW.status NOT IN ('pending','confirmed','checked_in') THEN DELETE FROM bed_occupancy WHERE camping_id = NEW.camping_id AND reservation_id = NEW.id; END IF;
        RETURN NEW;
      END; $$`)
    await q.query(
      `CREATE TRIGGER reservation_beds_release AFTER UPDATE OF status ON reservations FOR EACH ROW EXECUTE FUNCTION release_reservation_beds()`,
    )
  }
  async down(q: QueryRunner): Promise<void> {
    const rows = await q.query(
      `SELECT 1 FROM camping_private.accommodation_types WHERE inventory_mode = 'shared' OR pricing IS NOT NULL UNION ALL SELECT 1 FROM camping_private.accommodation_beds UNION ALL SELECT 1 FROM camping_private.reservations WHERE price_snapshot ? 'pricing' OR pets>0 OR price_snapshot->>'basis'='per_bed' OR capacity_override_reason IS NOT NULL UNION ALL SELECT 1 FROM camping_private.stays WHERE accommodation_price_snapshot ? 'pricing' OR pets>0 OR accommodation_price_snapshot->>'basis'='per_bed' UNION ALL SELECT 1 FROM camping_private.campings WHERE infants_consume_capacity LIMIT 1`,
    )
    if (rows.length)
      throw new Error(
        'Cannot downgrade while flexible pricing, beds, pets or occupancy settings are in use',
      )
    await q.query(`SET LOCAL search_path TO camping_private, public`)
    await q.query(
      `DROP TRIGGER reservation_beds_release ON reservations; DROP FUNCTION release_reservation_beds(); DROP TABLE bed_occupancy, reservation_beds, accommodation_beds`,
    )
    await q.query(
      `ALTER TABLE reservations DROP CONSTRAINT uq_reservations_camping_unit, DROP COLUMN capacity_override_reason, DROP COLUMN pets`,
    )
    await q.query(`ALTER TABLE stays DROP COLUMN pets`)
    await q.query(`ALTER TABLE campings DROP COLUMN infants_consume_capacity`)
    await q.query(`ALTER TABLE accommodation_types DROP CONSTRAINT accommodation_types_pricing_shape, DROP CONSTRAINT accommodation_types_pricing_basis, DROP CONSTRAINT accommodation_types_inventory_mode_check, DROP CONSTRAINT accommodation_types_occupancy_shape, DROP COLUMN pricing,
      ADD CONSTRAINT accommodation_types_inventory_mode_check CHECK (inventory_mode IN ('individual','unlimited')),
      ADD CONSTRAINT accommodation_types_occupancy_shape CHECK ((inventory_mode='individual' AND max_occupancy IS NOT NULL AND max_occupancy>=1) OR (inventory_mode='unlimited' AND max_occupancy IS NULL))`)
    for (const table of ['reservations', 'stays']) {
      const rows = (await q.query(
        `SELECT conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid=$1::regclass AND conname LIKE '%price_snapshot_shape'`,
        [table],
      )) as { conname: string; definition: string }[]
      for (const row of rows) {
        const definition = row.definition
          .replaceAll(
            "ARRAY['per_unit'::text, 'per_person'::text, 'per_bed'::text]",
            "ARRAY['per_unit'::text, 'per_person'::text]",
          )
          .replaceAll(
            "= ANY (ARRAY['per_unit'::text, 'per_bed'::text])",
            "= 'per_unit'::text",
          )
        await q.query(
          `ALTER TABLE ${table} DROP CONSTRAINT ${row.conname}, ADD CONSTRAINT ${row.conname} ${definition}`,
        )
      }
    }
    // The original trigger also accepts exactly individual/unlimited, now enforced above.
  }
}
