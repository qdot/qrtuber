import { ButtplugClient, ButtplugBrowserWebsocketClientConnector } from 'buttplug';

export class QRTuberIntifaceClient {
  private _client: ButtplugClient;

  constructor() {
    this._client = new ButtplugClient("QRTuber Browser Extension");
  }

  public connect() {
    this._client.connect(new ButtplugBrowserWebsocketClientConnector("http://127.0.0.1:12345")).then(() => console.log("Client connected"));
  }

  public disconnect() {
    this._client.disconnect();
  }

  public activateDeviceUpdates() {
  }

  public deactivateDeviceUpdates() {
  }

  public detectionEventHandler(args: any) {
    console.log(args);
    if (args["intiface_command"] === "speed" && args["speed"] !== undefined) {
      this.vibrateDevices(args["speed"]);
    }
  }

  public vibrateDevices(speed: number) {
    if (!this._client.connected) {
      return;
    }
    for (var device of this._client.devices) {
      if (device.vibrateAttributes.length > 0) {
        device.vibrate(speed);
      }
    }
  }
}