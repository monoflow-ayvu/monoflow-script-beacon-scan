import * as MonoUtils from "@fermuch/monoutils";
import { currentLogin, myID } from "@fermuch/monoutils";
import type { BeaconData } from "react-native-beacon-scanner";

declare class BeaconScanEvent extends MonoUtils.wk.event.BaseEvent {
  kind: 'beacon-scan-event';
  getData(): {beacons: BeaconData[]};
}

type ConfigBeaconCheck = {
  enableBeaconCheck: boolean;
  tags?: string[];
  pageId?: string;
  distanceFilter?: number;
}

const conf = new MonoUtils.config.Config<ConfigBeaconCheck>();

interface NearBeacon {
  name?: string;
  mac: string;
  distance: number;
  battery: number;
};

function wakeup() {
  if ('wakeup' in platform) {
    (platform as unknown as { wakeup: () => void }).wakeup();
  }
}


// take from: https://gist.github.com/JoostKiens/d834d8acd3a6c78324c9
function getIBeaconDistance(txPower: number, rssi: number) {
  if (rssi === 0) {
    return -1; // if we cannot determine accuracy, return -1.
  }

  var ratio = rssi * 1 / txPower;
  if (ratio < 1.0) {
    return Math.pow(ratio, 10);
  } else {
    return (0.89976) * Math.pow(ratio, 7.7095) + 0.111;
  }
}

function anyTagMatches(tags: string[]): boolean {
  // we always match if there are no tags
  if (!tags || tags.length === 0) return true;

  const userTags = env.project?.logins?.find((login) => login.key === currentLogin())?.tags || [];
  const deviceTags = env.project?.usersManager?.users?.find?.((u) => u.$modelId === myID())?.tags || [];
  const allTags = [...userTags, ...deviceTags];

  return tags.some((t) => allTags.includes(t));
}

function tryOpenPage(pageId: string) {
  if (!currentLogin()) {
    return;
  }

  if (!('goToPage' in platform)) {
    platform.log('no goToPage platform tool available');
    return;
  }

  platform.log(`showing page: ${pageId}`);
  (platform as unknown as { goToPage: (pageId: string) => void })?.goToPage?.(pageId);
}

function getBeaconCol() {
  return env.project?.collectionsManager?.ensureExists<{mac: string; name?: string}>('beacon', 'Beacon');
}

function findBeaconName(mac: string) {
  const prettyMac = mac.toLocaleUpperCase();
  const col = getBeaconCol()
  return col?.get(prettyMac)?.data?.name || '';
}

function isDifferent(beacon: NearBeacon | undefined): boolean {
  const current = env.data.CLOSEST_BEACON as NearBeacon | undefined;

  if (current && !beacon) {
    return true;
  }

  if (!current && beacon) {
    return true;
  }

  if (
       current?.mac !== beacon?.mac
    || current?.name !== beacon?.name
    || current?.battery !== beacon?.battery
  ) {
    return true;
  }

  return false;
}

messages.on('onInit', () => {
  getBeaconCol();
});

MonoUtils.wk.event.subscribe<BeaconScanEvent>('beacon-scan-event', (ev) => {
  env.project?.saveEvent(ev);

  if (!conf.get('enableBeaconCheck', false)) {
    return;
  }

  const maxDistance = conf.get('distanceFilter', 0) > 0 ? conf.get('distanceFilter', 0) : Number.MAX_SAFE_INTEGER;

  const nearBeacons: NearBeacon[] = ev.getData()?.beacons
    ?.filter((b) => b.frames.some((f) => f.type === 'ibeacon'))
    ?.filter((b) => b.battery !== 0 && b.battery !== -1)
    ?.map((b) => {
      const ibeaconFrame = b.frames.find((f) => f.type === 'ibeacon' as const) as never as {
        type: 'ibeacon';
        uuid: string;
        major: number;
        minor: number;
        tx: number;
      };
      
      return {
        mac: b.mac,
        distance: getIBeaconDistance(ibeaconFrame.tx, b.rssi),
        name: findBeaconName(b.mac) || '',
        battery: Math.floor(b.battery || -1),
      }
    })
    ?.filter((b) => b.distance <= maxDistance) ?? []
  const closestBeacon = nearBeacons.sort((a, b) => a.distance - b.distance)?.[0];
  
  if (isDifferent(closestBeacon)) {
    env.setData('CLOSEST_IBEACON', closestBeacon);
  }
});

messages.on('onPeriodic', () => {
  if (!currentLogin()) {
    return;
  }

  if (!conf.get('enableBeaconCheck', false)) {
    return;
  }

  if (!anyTagMatches(conf.get('tags', []))) {
    return;
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

