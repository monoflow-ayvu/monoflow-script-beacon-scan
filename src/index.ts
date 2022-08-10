import * as MonoUtils from "@fermuch/monoutils";
import type { BeaconData } from "react-native-beacon-scanner";

declare class BeaconScanEvent extends MonoUtils.wk.event.BaseEvent {
  kind: 'beacon-scan-event';
  beacons: BeaconData[];

  getData(): {beacons: BeaconData[]};
}

type ConfigBeaconCheck = {
  enableBeaconCheck: boolean;
  tags?: string[];
  pageId?: string;
}

type Config =
  ConfigBeaconCheck
  & {};

const conf = new MonoUtils.config.Config<Config>();

interface NearBeacon {
  name?: string;
  mac: string;
  distance: number;
};

MonoUtils.wk.event.subscribe<BeaconScanEvent>('beacon-scan-event', (ev) => {
  env.project?.saveEvent(ev);

  if (!conf.get('enableBeaconCheck', false)) {
    return;
  }

  const nearBeacons: NearBeacon[] = ev.beacons
    .filter((b) => b.frames.some((f) => f.type === 'ibeacon'))
    .map((b) => ({
      mac: b.mac,
      distance: 0,
    }))
  const closestBeacon = nearBeacons.sort((a, b) => a.distance - b.distance)?.[0] ?? [];
  if (!closestBeacon) {
    return;
  }

  env.setData('CLOSEST_IBEACON', closestBeacon);
});