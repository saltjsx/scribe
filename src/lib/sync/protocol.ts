export interface RemoteEntryRecord {
	id: string;
	createdAt: string;
	updatedAt: string;
	body: string;
	mood: number;
	deletedAt: string | null;
}

export interface SyncPushChange {
	id: string;
	createdAt: string;
	updatedAt: string;
	body: string;
	mood: number;
	deleted: boolean;
}

export interface SyncPullResponse {
	entries: RemoteEntryRecord[];
	cursor: string | null;
}

export interface SyncPushResponse {
	entries: RemoteEntryRecord[];
}
