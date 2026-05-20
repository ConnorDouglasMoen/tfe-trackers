/** Returns the reverse-domain plugin ID for a given path segment.
 *  All OBR metadata keys and popover IDs must be namespaced this way. */
export function getPluginId(path: string) {
  return `com.tfe-trackers/${path}`;
}
