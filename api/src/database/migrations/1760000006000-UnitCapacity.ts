import type { MigrationInterface, QueryRunner } from 'typeorm'

export class UnitCapacity1760000006000 implements MigrationInterface {
  name = 'UnitCapacity1760000006000'

  async up(runner: QueryRunner): Promise<void> {
    await runner.query('SET LOCAL search_path TO camping_private, public')
    await runner.query(
      'ALTER TABLE accommodation_units ADD COLUMN max_occupancy integer',
    )
    // Existing individual units inherit their type's previously required limit.
    await runner.query(`
      UPDATE accommodation_units AS unit
      SET max_occupancy = type.max_occupancy
      FROM accommodation_types AS type
      WHERE type.id = unit.accommodation_type_id AND type.camping_id = unit.camping_id
    `)
    await runner.query(`ALTER TABLE accommodation_units
      ALTER COLUMN max_occupancy SET NOT NULL,
      ADD CONSTRAINT ck_accommodation_units_max_occupancy CHECK (max_occupancy >= 1)`)
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query('SET LOCAL search_path TO camping_private, public')
    await runner.query(
      'ALTER TABLE accommodation_units DROP COLUMN max_occupancy',
    )
  }
}
