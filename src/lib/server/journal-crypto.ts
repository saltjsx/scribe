import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { getPrivateEnv } from '$lib/server/private-env';

const ENCRYPTED_PREFIX = 'enc:v1:';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

interface JournalPayload {
	body: string;
	mood: number;
}

function getMasterKey(): Buffer {
	const raw = getPrivateEnv('JOURNAL_SYNC_MASTER_KEY');

	if (!raw) {
		throw new Error('Missing JOURNAL_SYNC_MASTER_KEY environment variable.');
	}

	const key = Buffer.from(raw, 'base64');

	if (key.length !== 32) {
		throw new Error('JOURNAL_SYNC_MASTER_KEY must be a base64-encoded 32-byte key.');
	}

	return key;
}

function getAad(userId: string, entryId: string): Buffer {
	return Buffer.from(`${userId}:${entryId}`, 'utf8');
}

export function isEncryptedJournalBody(value: string): boolean {
	return value.startsWith(ENCRYPTED_PREFIX);
}

export function encryptJournalEntry(
	userId: string,
	entryId: string,
	payload: JournalPayload
): string {
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, getMasterKey(), iv);
	cipher.setAAD(getAad(userId, entryId));

	const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
	const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
	const authTag = cipher.getAuthTag();
	const packed = Buffer.concat([iv, authTag, ciphertext]).toString('base64');

	return `${ENCRYPTED_PREFIX}${packed}`;
}

export function decryptJournalEntry(
	userId: string,
	entryId: string,
	encryptedBody: string
): JournalPayload {
	const packed = encryptedBody.slice(ENCRYPTED_PREFIX.length);
	const buffer = Buffer.from(packed, 'base64');

	const iv = buffer.subarray(0, IV_LENGTH);
	const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + 16);
	const ciphertext = buffer.subarray(IV_LENGTH + 16);

	const decipher = createDecipheriv(ALGORITHM, getMasterKey(), iv);
	decipher.setAAD(getAad(userId, entryId));
	decipher.setAuthTag(authTag);

	const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
	const parsed = JSON.parse(plaintext) as Partial<JournalPayload>;

	return {
		body: typeof parsed.body === 'string' ? parsed.body : '',
		mood: typeof parsed.mood === 'number' ? parsed.mood : 5
	};
}
