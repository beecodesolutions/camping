import type { MigrationInterface, QueryRunner } from 'typeorm'

function schemaName(): string {
  const schema = process.env.DB_SCHEMA ?? 'camping_private'
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error('Invalid DB_SCHEMA')
  return `"${schema}"`
}

export class ReservationCreationHash1760000003000 implements MigrationInterface {
  name = 'ReservationCreationHash1760000003000'

  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = schemaName()
    await queryRunner.query(`SET LOCAL search_path TO ${schema}, public`)
    await queryRunner.query(
      `ALTER TABLE reservations ADD COLUMN create_request_hash varchar(64)`,
    )
    await queryRunner.query(`REVOKE ALL ON TABLE reservations FROM PUBLIC`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = schemaName()
    await queryRunner.query(`SET LOCAL search_path TO ${schema}, public`)
    const [row] = (await queryRunner.query(
      `SELECT count(*)::bigint AS count FROM reservations WHERE create_request_hash IS NOT NULL`,
    )) as Array<{ count: string }>
    if (row?.count !== '0')
      throw new Error(
        'Refusing to revert reservation creation hash while request hashes exist',
      )
    await queryRunner.query(
      `ALTER TABLE reservations DROP COLUMN IF EXISTS create_request_hash`,
    )
  }
}
