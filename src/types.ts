import { RingBuffer } from "./circular_array";

export interface NearBeacon {
  name?: string;
  mac: string;
  distance: number;
  battery: number;
  when: number;
};

export interface IBeaconScan {
  type: 'ibeacon';
  uuid: string;
  major: number;
  minor: number;
  tx: number;
}

export interface BeaconBatteryReading {
  when: number;
  battery: number;
}

export interface BeaconDistanceReading {
  when: number;
  distance: number;
}

export interface BeaconData {
  mac: string;
  latest: number;
  batteryReadings: RingBuffer<BeaconBatteryReading>;
  distanceReadings: RingBuffer<BeaconDistanceReading>;
}