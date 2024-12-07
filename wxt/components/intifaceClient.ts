import { ButtplugClient, ButtplugBrowserWebsocketClientConnector } from 'buttplug';

class QRTuberIntifaceClient {
  private _client: ButtplugClient = new ButtplugClient("QRTuber Browser Extension");

  constructor() {

  }

  public connect() {
    this._client.connect(new ButtplugBrowserWebsocketClientConnector("http://127.0.0.1:12345")).then(() => console.log("Client connected"));
  }

  public disconnect() {
    this._client.disconnect();
  }

  public vibrateDevices(speed: number) {

  }
}