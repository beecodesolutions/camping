import type { MigrationInterface, QueryRunner } from 'typeorm'

function schemaName(): string {
  const schema = process.env.DB_SCHEMA ?? 'camping_private'
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error('Invalid DB_SCHEMA')
  return `"${schema}"`
}

export class InitialSchema1760000000000 implements MigrationInterface {
  name = 'InitialSchema1760000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = schemaName()
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`)
    await queryRunner.query(`SET LOCAL search_path TO ${schema}, public`)
    await queryRunner.query(`
      CREATE TABLE campings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        stable_key varchar(100) NOT NULL UNIQUE,
        name varchar(160) NOT NULL,
        country varchar(2) NOT NULL,
        currency varchar(3) NOT NULL,
        timezone varchar(64) NOT NULL,
        age_ranges jsonb NOT NULL,
        rates jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT campings_country_format CHECK (country ~ '^[A-Z]{2}$'),
        CONSTRAINT campings_currency_format CHECK (currency ~ '^[A-Z]{3}$')
      )
    `)
    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        camping_id uuid NOT NULL REFERENCES campings(id) ON DELETE RESTRICT,
        username varchar(100) NOT NULL UNIQUE,
        name varchar(160) NOT NULL,
        password_hash varchar(255) NOT NULL,
        enabled boolean NOT NULL DEFAULT true,
        password_changed_at timestamptz,
        failed_login_count integer NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0),
        login_blocked_until timestamptz,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await queryRunner.query(`
      CREATE TABLE sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        token_hash varchar(64) NOT NULL UNIQUE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await queryRunner.query(`
      CREATE TABLE stays (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        camping_id uuid NOT NULL REFERENCES campings(id) ON DELETE RESTRICT,
        created_by_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        responsible_name text NOT NULL,
        document text NOT NULL DEFAULT '',
        nationality varchar(2) NOT NULL DEFAULT '',
        phone varchar(16) NOT NULL DEFAULT '',
        arrival_date date NOT NULL,
        estimated_departure date,
        adults bigint NOT NULL CHECK (adults >= 0),
        children bigint NOT NULL CHECK (children >= 0),
        infants bigint NOT NULL CHECK (infants >= 0),
        has_vehicle boolean NOT NULL DEFAULT false,
        vehicle_description text NOT NULL DEFAULT '',
        license_plate text NOT NULL DEFAULT '',
        location text NOT NULL DEFAULT '',
        currency varchar(3) NOT NULL,
        age_ranges jsonb NOT NULL,
        rates jsonb NOT NULL,
        version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
        closed_at timestamptz,
        closed_by_id uuid REFERENCES users(id) ON DELETE RESTRICT,
        closure jsonb,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT stays_people_required CHECK (adults + children + infants > 0),
        CONSTRAINT stays_departure_after_arrival CHECK (estimated_departure IS NULL OR estimated_departure >= arrival_date)
      )
    `)
    await queryRunner.query(
      `CREATE INDEX idx_stays_camping_closed ON stays (camping_id, closed_at)`,
    )
    await queryRunner.query(`
      CREATE TABLE extra_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        camping_id uuid NOT NULL REFERENCES campings(id) ON DELETE RESTRICT,
        seed_key varchar(100),
        description varchar(200) NOT NULL,
        category varchar(100) NOT NULL DEFAULT '',
        unit_price_minor bigint NOT NULL CHECK (unit_price_minor >= 0),
        enabled boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT extra_templates_seed_key_nonempty CHECK (seed_key IS NULL OR seed_key <> '')
      )
    `)
    await queryRunner.query(`
      CREATE TABLE applied_extras (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        stay_id uuid NOT NULL REFERENCES stays(id) ON DELETE CASCADE,
        template_id uuid REFERENCES extra_templates(id) ON DELETE SET NULL,
        description varchar(200) NOT NULL,
        category varchar(100) NOT NULL DEFAULT '',
        quantity bigint NOT NULL CHECK (quantity >= 1),
        unit_price_minor bigint NOT NULL CHECK (unit_price_minor >= 0),
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await queryRunner.query(
      `CREATE UNIQUE INDEX uq_extra_templates_camping_seed_key ON extra_templates (camping_id, seed_key) WHERE seed_key IS NOT NULL`,
    )
    await queryRunner.query(
      `REVOKE ALL ON TABLE campings, users, sessions, stays, extra_templates, applied_extras FROM PUBLIC`,
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = schemaName()
    await queryRunner.query(`SET LOCAL search_path TO ${schema}, public`)
    await queryRunner.query(`DROP TABLE IF EXISTS applied_extras`)
    await queryRunner.query(`DROP TABLE IF EXISTS extra_templates`)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stays_camping_closed`)
    await queryRunner.query(`DROP TABLE IF EXISTS stays`)
    await queryRunner.query(`DROP TABLE IF EXISTS sessions`)
    await queryRunner.query(`DROP TABLE IF EXISTS users`)
    await queryRunner.query(`DROP TABLE IF EXISTS campings`)
  }
}
