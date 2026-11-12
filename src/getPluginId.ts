/** Namespace a metadata key, menu ID, or storage key with this extension's ID. */
export function getPluginId(path: string) {
  return `com.tfe-trackers/${path}`;
}
