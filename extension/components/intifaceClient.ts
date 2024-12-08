import { ButtplugClient, ButtplugBrowserWebsocketClientConnector } from 'buttplug';

export class QRTuberIntifaceClient {
  private _client: ButtplugClient;

  constructor() {
    this._client = new ButtplugClient("QRTuber Browser Extension");
    browser.runtime.onMessage.addListener((message: any) => {
      if (message["intiface_command"] === undefined) {
        return false;
      }
      switch (message.intiface_command) {
        case "attach": {
          this.activateDeviceUpdates();
          break;
        }
        case "detach": {
          this.deactivateDeviceUpdates();
          break;
        }
        case "connect": {
          this.connect();
          break;
        }
        case "disconnect": {
          this.disconnect();
          break;
        }
      }
      return true;
    });
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