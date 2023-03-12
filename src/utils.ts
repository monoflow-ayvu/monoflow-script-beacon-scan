import { currentLogin, myID } from "@fermuch/monoutils";
import { BeaconData } from "react-native-beacon-scanner";
import { NearBeacon } from "./types";

export function wakeup() {
  if ('wakeup' in platform) {
    (platform as unknown as { wakeup: () => void }).wakeup();
  }
}

export function tryOpenPage(pageId: string) {
  if (!currentLogin()) {
    return;
  }

  if (!('goToPage' in platform)) {
    platform.log('no goToPage platform tool available');
    return;
  }

  (platform as unknown as { goToPage: (pageId: string) => void })?.goToPage?.(pageId);
}

const MY_TAGS = {
  loginId: '',
  lastUpdate: 0,
  tags: [],
};
const MAX_TAG_TIME = 10_000; // ms
function getMyTags(loginId) {
  if (MY_TAGS.loginId !== loginId || Date.now() - MY_TAGS.lastUpdate >= MAX_TAG_TIME) {
    const loginName = loginId || currentLogin() || '';
    const userTags = env.project?.logins?.find((login) => login.key === loginName || login.$modelId === loginName)?.tags || [];
    const deviceTags = env.project?.usersManager?.users?.find?.((u) => u.$modelId === myID())?.tags || [];
    const allTags = [...userTags, ...deviceTags];

    platform.log('[GPS] updating tags store');
    MY_TAGS.loginId = loginId;
    MY_TAGS.lastUpdate = Date.now();
    MY_TAGS.tags = allTags;
  }

  return MY_TAGS.tags;
}

export function anyTagMatches(tags: string[], loginId?: string): boolean {
  // we always match if there are no tags
  if (!tags || tags.length === 0) return true;

  const loginName = loginId || currentLogin() || '';
  const allTags = getMyTags(loginName);

  return tags.some((t) => allTags.includes(t));
}

export function getBeaconCol() {
  const col = env.project?.collectionsManager?.ensureExists<{mac: string; name?: string}>('beacon', 'Beacon');
  if (col?.watchAll !== true) {
    col?.setWatchAll(true);
  }
  return col;
}

export function findBeaconName(mac: string) {
  const prettyMac = mac.toLocaleUpperCase();
  const col = getBeaconCol()
  return col?.get(prettyMac)?.data?.name || '';
}

// take from: https://gist.github.com/JoostKiens/d834d8acd3a6c78324c9
export function getIBeaconDistance(txPower: number, rssi: number) {
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

export function isDifferent(beacon: NearBeacon | undefined): boolean {
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
    || current?.when !== beacon?.when
  ) {
    return true;
  }

  return false;
}

export function isValidMac(beacon: BeaconData | undefined): boolean {
  if (!beacon) return false;
  if (!beacon.mac) return false;

  const validMatches = [
    "AC233F", // minew
    "90F278", // radius
    "000479", // radius
  ]

  return validMatches.includes(
    beacon.mac.replace(/:/g, '').toLocaleUpperCase().slice(0, 6)
  )
}