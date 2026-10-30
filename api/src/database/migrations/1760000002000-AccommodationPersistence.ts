import type { MigrationInterface, QueryRunner } from 'typeorm'

function schemaName(): string {
  const schema = process.env.DB_SCHEMA ?? 'camping_private'
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error('Invalid DB_SCHEMA')
  return `"${schema}"`
}

export class AccommodationPersistence1760000002000 implements MigrationInterface {
  name = 'AccommodationPersistence1760000002000'

  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = schemaName()
    await queryRunner.query(`SET LOCAL search_path TO ${schema}, public`)

    const [tenantViolations] = (await queryRunner.query(`
      SELECT
        (SELECT count(*) FROM stays s
         LEFT JOIN users u ON u.camping_id = s.camping_id AND u.id = s.created_by_id
         WHERE u.id IS NULL)::bigint AS stay_creator_mismatch,
        (SELECT count(*) FROM stays s
         LEFT JOIN users u ON u.camping_id = s.camping_id AND u.id = s.closed_by_id
         WHERE s.closed_by_id IS NOT NULL AND u.id IS NULL)::bigint AS stay_closer_mismatch,
        (SELECT count(*) FROM payments p
         LEFT JOIN users u ON u.camping_id = p.camping_id AND u.id = p.recorded_by_id
         WHERE u.id IS NULL)::bigint AS payment_recorder_mismatch
    `)) as Array<{
      stay_creator_mismatch: string
      stay_closer_mismatch: string
      payment_recorder_mismatch: string
    }>
    if (
      tenantViolations?.stay_creator_mismatch !== '0' ||
      tenantViolations.stay_closer_mismatch !== '0' ||
      tenantViolations.payment_recorder_mismatch !== '0'
    )
      throw new Error(
        `Cannot add tenant-safe user links: stay creator mismatches=${tenantViolations?.stay_creator_mismatch ?? 'unknown'}, stay closer mismatches=${tenantViolations?.stay_closer_mismatch ?? 'unknown'}, payment recorder mismatches=${tenantViolations?.payment_recorder_mismatch ?? 'unknown'}; repair those rows before rerunning the migration`,
      )

    await queryRunner.query(
      `ALTER TABLE users ADD CONSTRAINT uq_users_camping_id UNIQUE (camping_id, id)`,
    )
    await queryRunner.query(`
      CREATE TABLE accommodation_types (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        camping_id uuid NOT NULL REFERENCES campings(id) ON DELETE RESTRICT,
        name varchar(200) NOT NULL,
        inventory_mode varchar(16) NOT NULL CHECK (inventory_mode IN ('individual', 'unlimited')),
        max_occupancy integer,
        base_nightly_price_minor bigint NOT NULL
          CHECK (base_nightly_price_minor >= 0 AND base_nightly_price_minor <= 9007199254740991),
        enabled boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_accommodation_types_camping_id UNIQUE (camping_id, id),
        CONSTRAINT uq_accommodation_types_camping_name UNIQUE (camping_id, name),
        CONSTRAINT accommodation_types_occupancy_shape CHECK (
          (inventory_mode = 'individual' AND max_occupancy IS NOT NULL AND max_occupancy >= 1)
          OR (inventory_mode = 'unlimited' AND max_occupancy IS NULL)
        ),
        CONSTRAINT accommodation_types_name_nonempty CHECK (length(btrim(name)) > 0)
      )
    `)
    await queryRunner.query(`
      CREATE TABLE accommodation_units (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        camping_id uuid NOT NULL REFERENCES campings(id) ON DELETE RESTRICT,
        accommodation_type_id uuid NOT NULL,
        name varchar(200) NOT NULL,
        enabled boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_accommodation_units_camping_id UNIQUE (camping_id, id),
        CONSTRAINT uq_accommodation_units_camping_type_id
          UNIQUE (camping_id, accommodation_type_id, id),
        CONSTRAINT uq_accommodation_units_type_name
          UNIQUE (camping_id, accommodation_type_id, name),
        CONSTRAINT fk_accommodation_units_type
          FOREIGN KEY (camping_id, accommodation_type_id)
          REFERENCES accommodation_types(camping_id, id) ON DELETE RESTRICT,
        CONSTRAINT accommodation_units_name_nonempty CHECK (length(btrim(name)) > 0)
      )
    `)
    await queryRunner.query(`
      CREATE TABLE reservations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        camping_id uuid NOT NULL REFERENCES campings(id) ON DELETE RESTRICT,
        accommodation_type_id uuid NOT NULL,
        unit_id uuid,
        responsible_name text NOT NULL,
        email varchar(254),
        phone varchar(40),
        document varchar(100),
        nationality varchar(2),
        check_in_date date NOT NULL,
        check_out_date date NOT NULL,
        adults integer NOT NULL CHECK (adults >= 0),
        children integer NOT NULL CHECK (children >= 0),
        infants integer NOT NULL CHECK (infants >= 0),
        status varchar(16) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
        source varchar(100) NOT NULL DEFAULT 'manual',
        notes varchar(500) NOT NULL DEFAULT '',
        price_snapshot jsonb NOT NULL,
        version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
        idempotency_key uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_reservations_camping_id UNIQUE (camping_id, id),
        CONSTRAINT uq_reservations_camping_idempotency UNIQUE (camping_id, idempotency_key),
        CONSTRAINT fk_reservations_type
          FOREIGN KEY (camping_id, accommodation_type_id)
          REFERENCES accommodation_types(camping_id, id) ON DELETE RESTRICT,
        CONSTRAINT fk_reservations_unit
          FOREIGN KEY (camping_id, accommodation_type_id, unit_id)
          REFERENCES accommodation_units(camping_id, accommodation_type_id, id) ON DELETE RESTRICT,
        CONSTRAINT reservations_dates_valid CHECK (check_out_date > check_in_date),
        CONSTRAINT reservations_people_required CHECK (adults + children + infants > 0),
        CONSTRAINT reservations_price_snapshot_shape CHECK ((
          jsonb_typeof(price_snapshot) = 'object'
          AND price_snapshot ? 'basis'
          AND price_snapshot->>'basis' IN ('per_unit', 'per_person')
          AND price_snapshot ? 'currency'
          AND price_snapshot->>'currency' ~ '^[A-Z]{3}$'
          AND price_snapshot ? 'totalMinor'
          AND jsonb_typeof(price_snapshot->'totalMinor') = 'number'
          AND (price_snapshot->>'totalMinor')::numeric >= 0
          AND (price_snapshot->>'totalMinor')::numeric <= 9007199254740991
          AND (price_snapshot->>'totalMinor')::numeric =
            trunc((price_snapshot->>'totalMinor')::numeric)
          AND (
            (
              NOT (price_snapshot ? 'adjustmentMinor')
              AND NOT (price_snapshot ? 'adjustmentReason')
            )
            OR (
              price_snapshot ? 'adjustmentMinor'
              AND price_snapshot ? 'adjustmentReason'
              AND jsonb_typeof(price_snapshot->'adjustmentMinor') = 'number'
              AND (price_snapshot->>'adjustmentMinor')::numeric >= -9007199254740991
              AND (price_snapshot->>'adjustmentMinor')::numeric <= 9007199254740991
              AND (price_snapshot->>'adjustmentMinor')::numeric = trunc((price_snapshot->>'adjustmentMinor')::numeric)
              AND jsonb_typeof(price_snapshot->'adjustmentReason') = 'string'
              AND length(btrim(price_snapshot->>'adjustmentReason')) BETWEEN 1 AND 500
            )
          )
          AND (
            (
              price_snapshot->>'basis' = 'per_unit'
              AND jsonb_typeof(price_snapshot->'baseNightlyPriceMinor') = 'number'
              AND (price_snapshot->>'baseNightlyPriceMinor')::numeric >= 0
              AND (price_snapshot->>'baseNightlyPriceMinor')::numeric <= 9007199254740991
              AND (price_snapshot->>'baseNightlyPriceMinor')::numeric = trunc((price_snapshot->>'baseNightlyPriceMinor')::numeric)
              AND jsonb_typeof(price_snapshot->'nights') = 'number'
              AND (price_snapshot->>'nights')::numeric >= 1
              AND (price_snapshot->>'nights')::numeric = trunc((price_snapshot->>'nights')::numeric)
            )
            OR (
              price_snapshot->>'basis' = 'per_person'
              AND jsonb_typeof(price_snapshot->'ageRanges') = 'object'
              AND jsonb_typeof(price_snapshot->'rates') = 'object'
              AND jsonb_typeof(price_snapshot->'nights') = 'number'
              AND (price_snapshot->>'nights')::numeric >= 1
              AND (price_snapshot->>'nights')::numeric = trunc((price_snapshot->>'nights')::numeric)
            )
          )
        ) IS TRUE)
      )
    `)
    await queryRunner.query(`
      CREATE FUNCTION validate_reservation_accommodation_unit()
      RETURNS trigger
      LANGUAGE plpgsql
      SET search_path TO ${schema}, public
      AS $$
      DECLARE type_mode varchar(16);
      BEGIN
        SELECT inventory_mode INTO type_mode
        FROM accommodation_types
        WHERE camping_id = NEW.camping_id AND id = NEW.accommodation_type_id;
        IF type_mode = 'individual' AND NEW.unit_id IS NULL THEN
          RAISE EXCEPTION 'individual accommodation reservations require a unit';
        END IF;
        IF type_mode = 'unlimited' AND NEW.unit_id IS NOT NULL THEN
          RAISE EXCEPTION 'unlimited accommodation reservations cannot specify a unit';
        END IF;
        RETURN NEW;
      END;
      $$
    `)
    await queryRunner.query(`
      CREATE TRIGGER reservations_validate_accommodation_unit
      BEFORE INSERT OR UPDATE OF camping_id, accommodation_type_id, unit_id
      ON reservations
      FOR EACH ROW EXECUTE FUNCTION validate_reservation_accommodation_unit()
    `)
    await queryRunner.query(`
      CREATE TABLE accommodation_blocks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        camping_id uuid NOT NULL REFERENCES campings(id) ON DELETE RESTRICT,
        accommodation_type_id uuid NOT NULL,
        unit_id uuid NOT NULL,
        check_in_date date NOT NULL,
        check_out_date date NOT NULL,
        reason varchar(200) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_accommodation_blocks_type
          FOREIGN KEY (camping_id, accommodation_type_id)
          REFERENCES accommodation_types(camping_id, id) ON DELETE RESTRICT,
        CONSTRAINT fk_accommodation_blocks_unit
          FOREIGN KEY (camping_id, accommodation_type_id, unit_id)
          REFERENCES accommodation_units(camping_id, accommodation_type_id, id) ON DELETE RESTRICT,
        CONSTRAINT accommodation_blocks_dates_valid CHECK (check_out_date > check_in_date),
        CONSTRAINT accommodation_blocks_reason_nonempty CHECK (length(btrim(reason)) > 0)
      )
    `)
    await queryRunner.query(
      `CREATE INDEX idx_accommodation_blocks_camping_type ON accommodation_blocks (camping_id, accommodation_type_id)`,
    )

    await queryRunner.query(`
      ALTER TABLE stays
        ADD COLUMN reservation_id uuid,
        ADD CONSTRAINT fk_stays_camping_reservation
          FOREIGN KEY (camping_id, reservation_id)
          REFERENCES reservations(camping_id, id) ON DELETE SET NULL (reservation_id),
        ADD CONSTRAINT uq_stays_camping_reservation
          UNIQUE (camping_id, id, reservation_id)
    `)
    await queryRunner.query(
      `CREATE UNIQUE INDEX uq_stays_reservation_id ON stays (reservation_id) WHERE reservation_id IS NOT NULL`,
    )

    await queryRunner.query(`
      ALTER TABLE payments
        ALTER COLUMN stay_id DROP NOT NULL,
        ADD COLUMN reservation_id uuid,
        ADD COLUMN voided_at timestamptz,
        ADD COLUMN voided_by_id uuid,
        ADD COLUMN void_reason varchar(200),
        ADD CONSTRAINT fk_payments_camping_reservation
          FOREIGN KEY (camping_id, reservation_id)
          REFERENCES reservations(camping_id, id) ON DELETE CASCADE,
        ADD CONSTRAINT fk_payments_camping_stay_reservation
          FOREIGN KEY (camping_id, stay_id, reservation_id)
          REFERENCES stays(camping_id, id, reservation_id) ON DELETE CASCADE,
        ADD CONSTRAINT fk_payments_camping_voided_by
          FOREIGN KEY (camping_id, voided_by_id)
          REFERENCES users(camping_id, id) ON DELETE RESTRICT,
        ADD CONSTRAINT payments_target_required
          CHECK (stay_id IS NOT NULL OR reservation_id IS NOT NULL),
        ADD CONSTRAINT payments_void_shape
          CHECK (
            (voided_at IS NULL AND voided_by_id IS NULL AND void_reason IS NULL)
            OR (voided_at IS NOT NULL AND voided_by_id IS NOT NULL AND void_reason IS NOT NULL AND length(btrim(void_reason)) > 0)
          )
    `)

    await queryRunner.query(`
      ALTER TABLE stays
        ADD CONSTRAINT fk_stays_camping_creator
          FOREIGN KEY (camping_id, created_by_id)
          REFERENCES users(camping_id, id) ON DELETE RESTRICT,
        ADD CONSTRAINT fk_stays_camping_closer
          FOREIGN KEY (camping_id, closed_by_id)
          REFERENCES users(camping_id, id) ON DELETE RESTRICT
    `)
    await queryRunner.query(`
      ALTER TABLE payments
        ADD CONSTRAINT fk_payments_camping_recorder
          FOREIGN KEY (camping_id, recorded_by_id)
          REFERENCES users(camping_id, id) ON DELETE RESTRICT
    `)

    await queryRunner.query(`
      CREATE TABLE outbox_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        camping_id uuid NOT NULL REFERENCES campings(id) ON DELETE RESTRICT,
        aggregate_type varchar(64) NOT NULL,
        aggregate_id uuid NOT NULL,
        event_type varchar(64) NOT NULL,
        payload jsonb NOT NULL,
        occurred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        published_at timestamptz,
        attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
        last_error text
      )
    `)
    await queryRunner.query(`
      CREATE FUNCTION validate_payment_targets()
      RETURNS trigger
      LANGUAGE plpgsql
      SET search_path TO ${schema}, public
      AS $$
      DECLARE stay_reservation_id uuid;
      BEGIN
        IF NEW.stay_id IS NOT NULL AND NEW.reservation_id IS NOT NULL THEN
          SELECT reservation_id INTO stay_reservation_id
          FROM stays
          WHERE camping_id = NEW.camping_id AND id = NEW.stay_id;
          IF stay_reservation_id IS DISTINCT FROM NEW.reservation_id THEN
            RAISE EXCEPTION 'payment stay and reservation targets must refer to the same reservation';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$
    `)
    await queryRunner.query(`
      CREATE TRIGGER payments_validate_targets
      BEFORE INSERT OR UPDATE OF camping_id, stay_id, reservation_id
      ON payments
      FOR EACH ROW EXECUTE FUNCTION validate_payment_targets()
    `)
    await queryRunner.query(
      `CREATE INDEX idx_outbox_events_pending ON outbox_events (occurred_at, id) WHERE published_at IS NULL`,
    )
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        camping_id uuid NOT NULL REFERENCES campings(id) ON DELETE RESTRICT,
        actor_id uuid,
        action varchar(64) NOT NULL,
        entity_type varchar(64) NOT NULL,
        entity_id uuid NOT NULL,
        before_state jsonb,
        after_state jsonb,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_audit_logs_actor
          FOREIGN KEY (camping_id, actor_id)
          REFERENCES users(camping_id, id) ON DELETE RESTRICT
      )
    `)
    await queryRunner.query(
      `CREATE INDEX idx_audit_logs_camping_time ON audit_logs (camping_id, created_at, id)`,
    )

    await queryRunner.query(
      `REVOKE ALL ON TABLE accommodation_types, accommodation_units, accommodation_blocks, reservations, outbox_events, audit_logs FROM PUBLIC`,
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = schemaName()
    await queryRunner.query(`SET LOCAL search_path TO ${schema}, public`)
    const [counts] = (await queryRunner.query(`
      SELECT (
        (SELECT count(*) FROM reservations)
        + (SELECT count(*) FROM accommodation_types)
        + (SELECT count(*) FROM accommodation_units)
        + (SELECT count(*) FROM accommodation_blocks)
        + (SELECT count(*) FROM outbox_events)
        + (SELECT count(*) FROM audit_logs)
        + (SELECT count(*) FROM stays WHERE reservation_id IS NOT NULL)
        + (SELECT count(*) FROM payments WHERE reservation_id IS NOT NULL)
        + (SELECT count(*) FROM payments
           WHERE voided_at IS NOT NULL OR voided_by_id IS NOT NULL OR void_reason IS NOT NULL)
      )::bigint AS count
    `)) as Array<{ count: string }>
    if (counts?.count !== '0')
      throw new Error(
        'Refusing to revert accommodation persistence while reservation data or reservation-linked financial data exists',
      )

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_audit_logs_camping_time, idx_outbox_events_pending, idx_accommodation_blocks_camping_type`,
    )
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`)
    await queryRunner.query(`DROP TABLE IF EXISTS outbox_events`)
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS payments_validate_targets ON payments`,
    )
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS validate_payment_targets()`,
    )
    await queryRunner.query(
      `ALTER TABLE payments DROP CONSTRAINT IF EXISTS fk_payments_camping_reservation, DROP CONSTRAINT IF EXISTS fk_payments_camping_stay_reservation, DROP CONSTRAINT IF EXISTS fk_payments_camping_voided_by, DROP CONSTRAINT IF EXISTS fk_payments_camping_recorder, DROP CONSTRAINT IF EXISTS payments_target_required, DROP CONSTRAINT IF EXISTS payments_void_shape`,
    )
    await queryRunner.query(
      `ALTER TABLE payments DROP COLUMN IF EXISTS reservation_id, DROP COLUMN IF EXISTS voided_at, DROP COLUMN IF EXISTS voided_by_id, DROP COLUMN IF EXISTS void_reason, ALTER COLUMN stay_id SET NOT NULL`,
    )
    await queryRunner.query(`DROP INDEX IF EXISTS uq_stays_reservation_id`)
    await queryRunner.query(
      `ALTER TABLE stays DROP CONSTRAINT IF EXISTS uq_stays_camping_reservation, DROP CONSTRAINT IF EXISTS fk_stays_camping_reservation, DROP CONSTRAINT IF EXISTS fk_stays_camping_creator, DROP CONSTRAINT IF EXISTS fk_stays_camping_closer, DROP COLUMN IF EXISTS reservation_id`,
    )
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS reservations_validate_accommodation_unit ON reservations`,
    )
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS validate_reservation_accommodation_unit()`,
    )
    await queryRunner.query(`DROP TABLE IF EXISTS accommodation_blocks`)
    await queryRunner.query(`DROP TABLE IF EXISTS reservations`)
    await queryRunner.query(`DROP TABLE IF EXISTS accommodation_units`)
    await queryRunner.query(`DROP TABLE IF EXISTS accommodation_types`)
    await queryRunner.query(
      `ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_camping_id`,
    )
  }
}
