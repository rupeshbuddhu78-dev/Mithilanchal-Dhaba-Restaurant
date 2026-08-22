export function hasPersistedMediaReference(input: { targetUrl: string; settingsUrls: Array<string | null | undefined>; categoryReferenced: boolean; menuReferenced: boolean; orderSnapshotReferenced: boolean }) {
  return input.settingsUrls.includes(input.targetUrl) || input.categoryReferenced || input.menuReferenced || input.orderSnapshotReferenced;
}
