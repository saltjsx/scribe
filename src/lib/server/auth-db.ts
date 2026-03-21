import { Pool } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import { getPrivateEnv } from '$lib/server/private-env';

const databaseUrl = getPrivateEnv('DATABASE_URL');

if (!databaseUrl) {
	throw new Error('DATABASE_URL is missing');
}

export const authPool = new Pool({
	connectionString: databaseUrl,
	max: 10
});

export const authDb = new Kysely({
	dialect: new PostgresDialect({
		pool: authPool
	})
});
