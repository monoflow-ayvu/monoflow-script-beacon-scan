import * as MonoUtils from "@fermuch/monoutils";
import type { BeaconData } from "react-native-beacon-scanner";

declare class BeaconScanEvent extends MonoUtils.wk.event.BaseEvent {
  kind: 'beacon-scan-event';
  beacons: BeaconData[];

  getData(): {beacons: BeaconData[]};
}

type Config = Record<string, unknown> & {}
const conf = new MonoUtils.config.Config<Config>();

interface NearBeacon {
  mac: string;
  rssi: number;
  lastUpdate: number;
};
const nearBeacons: NearBeacon[] = [];

MonoUtils.wk.event.subscribe<BeaconScanEvent>('beacon-scan-event', (ev) => {
  env.project?.saveEvent(ev);
});