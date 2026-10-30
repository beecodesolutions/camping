import type { MigrationInterface, QueryRunner } from 'typeorm'

export class MoneyPrecision1760000005000 implements MigrationInterface {
  name = 'MoneyPrecision1760000005000'

  async up(runner: QueryRunner): Promise<void> {
    await runner.query('SET LOCAL search_path TO camping_private, public')
    await runner.query(
      'ALTER TABLE campings ADD COLUMN money_decimals smallint DEFAULT 0 CHECK (money_decimals IS NULL OR money_decimals = 0)',
    )
    // NULL preserves full precision for every pre-existing stay.
    await runner.query(
      'ALTER TABLE stays ADD COLUMN money_decimals smallint CHECK (money_decimals IS NULL OR money_decimals = 0)',
    )
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query('SET LOCAL search_path TO camping_private, public')
    const [row] = await runner.query(
      "SELECT ((SELECT count(*) FROM stays WHERE money_decimals IS NOT NULL) + (SELECT count(*) FROM reservations WHERE price_snapshot ? 'moneyDecimals'))::text AS count",
    )
    if (row.count !== '0')
      throw new Error('Cannot remove money precision while frozen stays use it')
    await runner.query('ALTER TABLE stays DROP COLUMN money_decimals')
    await runner.query('ALTER TABLE campings DROP COLUMN money_decimals')
  }
}
