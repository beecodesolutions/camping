import type { MigrationInterface, QueryRunner } from 'typeorm'

function schemaName(): string {
  const schema = process.env.DB_SCHEMA ?? 'camping_private'
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error('Invalid DB_SCHEMA')
  return `"${schema}"`
}

export class ReservationStayPricing1760000004000 implements MigrationInterface {
  name = 'ReservationStayPricing1760000004000'

  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = schemaName()
    await queryRunner.query(`SET LOCAL search_path TO ${schema}, public`)
    await queryRunner.query(
      `ALTER TABLE stays ADD COLUMN accommodation_price_snapshot jsonb`,
    )
    await queryRunner.query(`
      ALTER TABLE stays
      ADD CONSTRAINT stays_accommodation_price_snapshot_shape CHECK (
        accommodation_price_snapshot IS NULL OR (
          jsonb_typeof(accommodation_price_snapshot) = 'object'
          AND accommodation_price_snapshot ? 'basis'
          AND accommodation_price_snapshot->>'basis' IN ('per_unit', 'per_person')
          AND accommodation_price_snapshot ? 'currency'
          AND accommodation_price_snapshot->>'currency' ~ '^[A-Z]{3}$'
          AND accommodation_price_snapshot ? 'totalMinor'
          AND jsonb_typeof(accommodation_price_snapshot->'totalMinor') = 'number'
          AND (accommodation_price_snapshot->>'totalMinor')::numeric >= 0
          AND (accommodation_price_snapshot->>'totalMinor')::numeric <= 9007199254740991
          AND (accommodation_price_snapshot->>'totalMinor')::numeric = trunc((accommodation_price_snapshot->>'totalMinor')::numeric)
          AND (
            (
              NOT (accommodation_price_snapshot ? 'adjustmentMinor')
              AND NOT (accommodation_price_snapshot ? 'adjustmentReason')
            )
            OR (
              accommodation_price_snapshot ? 'adjustmentMinor'
              AND accommodation_price_snapshot ? 'adjustmentReason'
              AND jsonb_typeof(accommodation_price_snapshot->'adjustmentMinor') = 'number'
              AND (accommodation_price_snapshot->>'adjustmentMinor')::numeric >= -9007199254740991
              AND (accommodation_price_snapshot->>'adjustmentMinor')::numeric <= 9007199254740991
              AND (accommodation_price_snapshot->>'adjustmentMinor')::numeric = trunc((accommodation_price_snapshot->>'adjustmentMinor')::numeric)
              AND jsonb_typeof(accommodation_price_snapshot->'adjustmentReason') = 'string'
              AND length(btrim(accommodation_price_snapshot->>'adjustmentReason')) BETWEEN 1 AND 500
            )
          )
          AND (
            (
              accommodation_price_snapshot->>'basis' = 'per_unit'
              AND jsonb_typeof(accommodation_price_snapshot->'baseNightlyPriceMinor') = 'number'
              AND (accommodation_price_snapshot->>'baseNightlyPriceMinor')::numeric >= 0
              AND (accommodation_price_snapshot->>'baseNightlyPriceMinor')::numeric <= 9007199254740991
              AND (accommodation_price_snapshot->>'baseNightlyPriceMinor')::numeric = trunc((accommodation_price_snapshot->>'baseNightlyPriceMinor')::numeric)
              AND jsonb_typeof(accommodation_price_snapshot->'nights') = 'number'
              AND (accommodation_price_snapshot->>'nights')::numeric >= 1
              AND (accommodation_price_snapshot->>'nights')::numeric = trunc((accommodation_price_snapshot->>'nights')::numeric)
            )
            OR (
              accommodation_price_snapshot->>'basis' = 'per_person'
              AND jsonb_typeof(accommodation_price_snapshot->'ageRanges') = 'object'
              AND jsonb_typeof(accommodation_price_snapshot->'rates') = 'object'
              AND jsonb_typeof(accommodation_price_snapshot->'nights') = 'number'
              AND (accommodation_price_snapshot->>'nights')::numeric >= 1
              AND (accommodation_price_snapshot->>'nights')::numeric = trunc((accommodation_price_snapshot->>'nights')::numeric)
            )
          )
        )
      )
    `)
    await queryRunner.query(`REVOKE ALL ON TABLE stays FROM PUBLIC`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = schemaName()
    await queryRunner.query(`SET LOCAL search_path TO ${schema}, public`)
    const [row] = (await queryRunner.query(
      `SELECT count(*)::bigint AS count FROM stays WHERE accommodation_price_snapshot IS NOT NULL`,
    )) as Array<{ count: string }>
    if (row?.count !== '0')
      throw new Error(
        'Refusing to revert reservation stay pricing while stay snapshots exist',
      )
    await queryRunner.query(
      `ALTER TABLE stays DROP CONSTRAINT IF EXISTS stays_accommodation_price_snapshot_shape, DROP COLUMN IF EXISTS accommodation_price_snapshot`,
    )
  }
}
