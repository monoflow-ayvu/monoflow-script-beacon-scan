import * as MonoUtils from "@fermuch/monoutils";
import type { BeaconData } from "react-native-beacon-scanner";

export declare class BeaconScanEvent extends MonoUtils.wk.event.BaseEvent {
  kind: 'beacon-scan-event';
  getData(): {beacons: BeaconData[]};
}

export declare class BeaconScanSingleEvent extends MonoUtils.wk.event.BaseEvent {
  kind: 'beacon-scan-single-event';
  getData(): BeaconData;
}