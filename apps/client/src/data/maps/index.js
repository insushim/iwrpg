import auroraTown from './aurora_town';
import treeshadeTown from './treeshade_town';
import crimsonFortress from './crimson_fortress';
import verityCitadel from './verity_citadel';
import starhaven from './starhaven';
import auroraFields from './aurora_fields';
import forgottenMeadow from './forgotten_meadow';
import whisperWoods from './whisper_woods';
import sunkenMine from './sunken_mine';
import mistwailMarsh from './mistwail_marsh';
import ruinedCitadel from './ruined_citadel';
import ashenCaverns from './ashen_caverns';
import azureGrove from './azure_grove';
import ruinedTemple from './ruined_temple';
import pyrePeaks from './pyre_peaks';
import aetherRift from './aether_rift';
import drakensvale from './drakensvale';
export * from './types';
export const ALL_MAPS = {
    aurora_town: auroraTown,
    treeshade_town: treeshadeTown,
    crimson_fortress: crimsonFortress,
    verity_citadel: verityCitadel,
    starhaven: starhaven,
    aurora_fields: auroraFields,
    forgotten_meadow: forgottenMeadow,
    whisper_woods: whisperWoods,
    sunken_mine: sunkenMine,
    mistwail_marsh: mistwailMarsh,
    ruined_citadel: ruinedCitadel,
    ashen_caverns: ashenCaverns,
    azure_grove: azureGrove,
    ruined_temple: ruinedTemple,
    pyre_peaks: pyrePeaks,
    aether_rift: aetherRift,
    drakensvale: drakensvale,
};
export const MAP_IDS = Object.keys(ALL_MAPS);
