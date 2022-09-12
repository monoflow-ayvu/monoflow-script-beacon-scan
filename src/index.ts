import * as MonoUtils from "@fermuch/monoutils";
import { currentLogin } from "@fermuch/monoutils";
import { BeaconData } from "react-native-beacon-scanner";
import { BeaconMemoryStore } from "./beacon_store";
import { conf } from "./config";
import { BeaconScanEvent, BeaconScanSingleEvent } from "./events";
import { IBeaconScan, NearBeacon } from "./types";
import { anyTagMatches, findBeaconName, getBeaconCol, getIBeaconDistance, isDifferent, tryOpenPage, wakeup } from "./utils";

const beaconStore = new BeaconMemoryStore();

messages.on('onInit', () => {
  // ensure collection exists and is subscribed
  getBeaconCol();
});

messages.on('onEnd', () => {
  if (conf.get('disableLogout', false)) {
    // restore drawer
    env.setData('DRAWER_DISABLED', false);
  }
});

function onBatteryUpdate(beacon: BeaconData) {
  if (beacon.battery > 0.0) {
    beaconStore.addBatteryReading(beacon.mac, beacon.battery);
  }
}

function onDistanceUpdate(beacon: BeaconData, ibeacon: IBeaconScan) {
  const minDistance = 0.0000000001;
  const maxDistance =
    conf.get('distanceFilter', 0) > 0
      ? conf.get('distanceFilter', 0)
      : Number.MAX_SAFE_INTEGER;
  
  const distance = getIBeaconDistance(ibeacon.tx, beacon.rssi);
  if (distance > minDistance && distance < maxDistance) {
    beaconStore.addDistanceReading(beacon.mac, distance);
  }
}

export function maybeUpdateData() {
  const current = env.data.CLOSEST_IBEACON as NearBeacon | null;
  const closestNow = beaconStore.getNearest();

  if (current !== null && !closestNow) {
    env.setData('CLOSEST_IBEACON', null);
  }

  if (closestNow && isDifferent(closestNow)) {
    env.setData('CLOSEST_IBEACON', {
      ...closestNow,
      name: findBeaconName(closestNow.mac),
    } as NearBeacon);
  }
}

MonoUtils.wk.event.subscribe<BeaconScanSingleEvent>('beacon-scan-single-event', (ev) => {
  if (!conf.get('enableBeaconCheck', false)) {
    return;
  }
  
  const data = ev.getData();
  if (!data) return;
  onBatteryUpdate(data);

  const ibeaconFrame = data.frames?.find((f) => f.type === 'ibeacon') as IBeaconScan | undefined;
  if (!ibeaconFrame) return;
  onDistanceUpdate(data, ibeaconFrame);
});

MonoUtils.wk.event.subscribe<BeaconScanEvent>('beacon-scan-event', (ev) => {
  env.project?.saveEvent(ev);
});

messages.on('onPeriodic', () => {
  maybeUpdateData();

  if (!currentLogin()) {
    return;
  }

  if (!conf.get('enableBeaconCheck', false)) {
    return;
  }

  if (!anyTagMatches(conf.get('tags', []))) {
    return;
  }

  if (conf.get('disableLogout', false) && env.data.DRAWER_DISABLED !== true) {
    env.setData('DRAWER_DISABLED', true);
  } else if (conf.get('disableLogout', false) === false && env.data.DRAWER_DISABLED !== false) {
    env.setData('DRAWER_DISABLED', false);
  }

  // always keep the screen ON
  wakeup();

  const pageId = conf.get('pageId', '');
  if (!pageId) {
    platform.log('tags matches but no page id provided');
    return;
  }

  const page = env.project?.pagesManager?.pages?.find((p) => p.$modelId === pageId)
  if (page.show === false) {
    page._setRaw({show: true});
  }
  if (!page) {
    platform.log('tags matches but page not found');
    return;
  }

  const currentPage = String(env.data.CURRENT_PAGE || '');
  if (currentPage !== 'Login' && currentPage !== page.title) {
    tryOpenPage(pageId);
  }
});

