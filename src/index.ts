import * as MonoUtils from "@fermuch/monoutils";
import type { BeaconData } from "react-native-beacon-scanner";

// based on settingsSchema @ package.json
type Config = Record<string, unknown> & {}

const conf = new MonoUtils.config.Config<Config>();

declare class BeaconScanEvent extends MonoUtils.wk.event.BaseEvent {
  kind: 'beacon-scan-event';
  beacons: BeaconData[];

  getData(): {beacons: BeaconData[]};
}

MonoUtils.wk.event.subscribe<BeaconScanEvent>('beacon-scan-event', (ev) => {
  env.project?.saveEvent(ev);
});