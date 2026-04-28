// Re-export and helper accessors for map data.
import { ALL_MAPS } from '../../../client/src/data/maps/index.js';
export { ALL_MAPS, MAP_IDS } from '../../../client/src/data/maps/index.js';
export type { MapDef, MapSpawnPoint, MapPortal } from '../../../client/src/data/maps/types.js';

export function getMapDef(id: string) {
  return ALL_MAPS[id];
}
