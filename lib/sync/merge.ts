type VersionLike = {
  updatedAt: string;
  deviceId: string;
  lastMutationId: string;
};

export function compareRecordVersion(left: VersionLike, right: VersionLike) {
  const leftTime = new Date(left.updatedAt).getTime();
  const rightTime = new Date(right.updatedAt).getTime();

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  const deviceCompare = left.deviceId.localeCompare(right.deviceId);
  if (deviceCompare !== 0) {
    return deviceCompare;
  }

  return left.lastMutationId.localeCompare(right.lastMutationId);
}

export function shouldReplaceRecord(current: VersionLike | null | undefined, incoming: VersionLike) {
  if (!current) {
    return true;
  }

  return compareRecordVersion(incoming, current) > 0;
}
