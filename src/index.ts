import * as MonoUtils from "@fermuch/monoutils";
import { BaseEvent } from "@fermuch/monoutils/build/types/well_known/event";
import type { BeaconData } from "react-native-beacon-scanner";

// based on settingsSchema @ package.json
type Config = Record<string, unknown> & {}

const conf = new MonoUtils.config.Config<Config>();

declare class BeaconScanEvent extends BaseEvent {
  kind: 'beacon-scan-event';
  beacons: BeaconData[];

  getData(): {beacons: BeaconData[]};
}

MonoUtils.wk.event.subscribe<BeaconScanEvent>('beacon-scan-event', (ev) => {
  env.project?.saveEvent(ev);
});