import * as MonoUtils from "@fermuch/monoutils";

type Config = {
  enableBeaconCheck: boolean;
  tags?: string[];
  pageId?: string;
  distanceFilter?: number;
  disableLogout?: boolean;
}

export const conf = new MonoUtils.config.Config<Config>();