import type { MigrationInterface, QueryRunner } from 'typeorm'

function schemaName(): string {
  const schema = process.env.DB_SCHEMA ?? 'camping_private'
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error('Invalid DB_SCHEMA')
  return `"${schema}"`
}

export class AddPayments1760000001000 implements MigrationInterface {
  name = 'AddPayments1760000001000'

  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = schemaName()
    await queryRunner.query(`SET LOCAL search_path TO ${schema}, public`)
    await queryRunner.query(
      `CREATE UNIQUE INDEX uq_stays_camping_id ON stays (camping_id, id)`,
    )
    await queryRunner.query(`
      CREATE TABLE payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        camping_id uuid NOT NULL REFERENCES campings(id) ON DELETE RESTRICT,
        stay_id uuid NOT NULL,
        amount_minor bigint NOT NULL CHECK (amount_minor > 0 AND amount_minor <= 9007199254740991),
        method varchar(16) NOT NULL CHECK (method IN ('cash', 'transfer', 'card')),
        paid_on date NOT NULL,
        note varchar(200) NOT NULL DEFAULT '',
        recorded_by_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        idempotency_key uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_payments_camping_stay
          FOREIGN KEY (camping_id, stay_id)
          REFERENCES stays(camping_id, id) ON DELETE CASCADE,
        CONSTRAINT uq_payments_camping_idempotency
          UNIQUE (camping_id, idempotency_key)
      )
    `)
    await queryRunner.query(
      `CREATE INDEX idx_payments_stay_created ON payments (stay_id, created_at, id)`,
    )
    await queryRunner.query(`REVOKE ALL ON TABLE payments FROM PUBLIC`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = schemaName()
    await queryRunner.query(`SET LOCAL search_path TO ${schema}, public`)
    await queryRunner.query(`DROP TABLE IF EXISTS payments`)
    await queryRunner.query(`DROP INDEX IF EXISTS uq_stays_camping_id`)
  }
}
