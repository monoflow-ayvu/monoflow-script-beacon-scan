import * as MonoUtils from "@fermuch/monoutils";
import type { BeaconData } from "react-native-beacon-scanner";
const read = require('fs').readFileSync;
const join = require('path').join;

jest.useFakeTimers();

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
        lastUpdate: Date.now(),
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

      jest.setSystemTime(new Date('2020-01-01 00:00:00'));

      expect(env.data.CLOSEST_IBEACON).toBeFalsy();
      messages.emit('onEvent', new FakeBeaconScanEvent());
      expect(env.data.CLOSEST_IBEACON).toStrictEqual({
        mac: "00:11:22:33:44:55",
        distance: 0.002637966120962853,
        name: '',
        battery: 80,
        when: Number(new Date('2020-01-01 00:00:00'))
      });
    });

    xit('omits values with distanceFilter', () => {});
    xit('CLOSEST_BEACON=null when there are no matching items in the scan', () => {});
  });

  it('removes old beacon when >30 seconds have passed', () => {
    loadScript();

    jest.setSystemTime(new Date('2020-01-01 00:00:00'));

    expect(env.data.CLOSEST_IBEACON).toBeFalsy();
    messages.emit('onEvent', new FakeBeaconScanEvent());
    expect(env.data.CLOSEST_IBEACON).toStrictEqual({
      mac: "00:11:22:33:44:55",
      distance: 0.002637966120962853,
      name: '',
      battery: 80,
      when: Number(new Date('2020-01-01 00:00:00'))
    });

    jest.setSystemTime(new Date('2020-01-01 00:00:01'));
    messages.emit('onPeriodic');
    expect(env.data.CLOSEST_IBEACON).toBeTruthy();

    jest.setSystemTime(new Date('2020-01-01 00:00:30'));
    messages.emit('onPeriodic');
    expect(env.data.CLOSEST_IBEACON).toBeTruthy();

    jest.setSystemTime(new Date('2020-01-01 00:00:31'));
    messages.emit('onPeriodic');
    expect(env.data.CLOSEST_IBEACON).toBeFalsy();
  })
});

describe('onPeriodic()', () => {
  xit('calls wakeup', () => {});
});
