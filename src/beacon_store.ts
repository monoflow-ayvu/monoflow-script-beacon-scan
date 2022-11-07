/**
 * Memory store for beacon scans
 */

import { RingBuffer } from "./circular_array";
import { BeaconBatteryReading, BeaconData, BeaconDistanceReading, NearBeacon } from "./types";
const MAX_TIME_MS = 30 * 1000; // 30 seconds
const MAX_BUFFER_COUNT = 7;

export class BeaconMemoryStore {
  private beacons: BeaconData[] = [];

  public getNearest(): NearBeacon | null {
    const nearest = this.beacons
      .filter(this.isInTime)
      .map(this.toNearBeacon)
      .sort((a, b) => a.distance - b.distance);
    return nearest?.[0] || null;
  }

  public addBatteryReading(mac: string, battery: number) {
    this.beacons[this.findIndex(mac)].batteryReadings.add({
      battery,
      when: Date.now(),
    })
    this.beacons[this.findIndex(mac)].latest = Date.now();
  }

  public addDistanceReading(mac: string, distance: number) {
    this.beacons[this.findIndex(mac)].distanceReadings.add({
      distance,
      when: Date.now(),
    });
    this.beacons[this.findIndex(mac)].latest = Date.now();
  }

  private findIndex(mac: string) {
    const idx = this.beacons.findIndex((b) => b.mac === mac);
    if (idx === -1) {
      return this.beacons.push({
        mac,
        batteryReadings: new RingBuffer<BeaconBatteryReading>(MAX_BUFFER_COUNT),
        distanceReadings: new RingBuffer<BeaconDistanceReading>(3),
        latest: Date.now(),
      }) - 1;
    }

    return idx;
  }

  private isInTime(beacon: BeaconData): boolean {
    const now = Date.now()
    if ((now - beacon.latest) > MAX_TIME_MS) {
      return false;
    }

    return true;
  }

  private toNearBeacon(beacon: BeaconData): NearBeacon {
    const now = Date.now()

    const distances = beacon.distanceReadings.toArray(); // .filter((b) => (now - b.when) < MAX_TIME_MS);
    const distance = distances.reduce((acc, data) => (acc + data.distance), 0) / distances.length;

    const batteries = beacon.batteryReadings.toArray(); // .filter((b) => (now - b.when) < MAX_TIME_MS);
    const battery = Math.floor(batteries.reduce((acc, data) => (acc + data.battery), 0) / batteries.length);

    return {
      mac: beacon.mac,
      when: beacon.latest,
      battery: battery || -1,
      distance: distance || -1,
    }
  }
}