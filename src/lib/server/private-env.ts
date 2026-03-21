import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readEnvFile(filePath: string): Record<string, string> {
	if (!existsSync(filePath)) return {};

	const content = readFileSync(filePath, 'utf8');
	const entries: Record<string, string> = {};

	for (const rawLine of content.split('\n')) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;

		const separatorIndex = line.indexOf('=');
		if (separatorIndex === -1) continue;

		const key = line.slice(0, separatorIndex).trim();
		const value = line.slice(separatorIndex + 1).trim();
		entries[key] = value;
	}

	return entries;
}

const localEnv = readEnvFile(resolve(process.cwd(), '.env.local'));

export function getPrivateEnv(key: string): string | undefined {
	return localEnv[key] || process.env[key];
}
