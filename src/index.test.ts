import * as MonoUtils from "@fermuch/monoutils";
import type { BeaconData } from "react-native-beacon-scanner";
const read = require('fs').readFileSync;
const join = require('path').join;

function loadScript() {
  // import global script
  const script = read(join(__dirname, '..', 'dist', 'bundle.js')).toString('utf-8');
  eval(script);
}

class FakeBeaconScanEvent extends MonoUtils.wk.event.BaseEvent {
  kind = 'beacon-scan-event' as const;
  beacons: BeaconData[] =
    [
      {
        battery: 80,
        frames: [
          {
            major: 0,
            minor: 0,
            tx: -67,
            type: "ibeacon",
            uuid: "563DA3F0-A45E-4F73-9DD9-74976A3231D4"
          }
        ],
        lastUpdate: 1660068194612,
        mac: "00:11:22:33:44:55",
        name: "Plus",
        rssi: -37
      }
    ];

  getData(): { beacons: BeaconData[] } {
    return {
      beacons: this.beacons
    }
  };
}

describe("onInit", () => {
  // clean listeners
  afterEach(() => {
    messages.removeAllListeners();
  });

  it('runs without errors', () => {
    loadScript();
    messages.emit('onInit');
  });
});

describe('onEvent(beacon-scan-event)', () => {
  // clean listeners
  afterEach(() => {
    messages.removeAllListeners();
    env.setData('CLOSEST_IBEACON', undefined);
  });

  describe('enableBeaconCheck=true', () => {
    it('sets CLOSEST_IBEACON', () => {
      getSettings = () => ({
        enableBeaconCheck: true,
      })
      loadScript();

      expect(env.data.CLOSEST_IBEACON).toBeFalsy();
      messages.emit('onEvent', new FakeBeaconScanEvent());
      expect(env.data.CLOSEST_IBEACON).toStrictEqual({
        mac: "00:11:22:33:44:55",
        distance: 0.002637966120962853,
      });
      console.log(env.data.CLOSEST_IBEACON)
    });
  });
});
