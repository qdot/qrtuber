import React, { Component, useState } from 'react';
import { ContentVideoHandler, HapticsState, IntifaceHapticsAdapter, QRCodeFinder } from 'qrtuber';

function legacySpeedMessageToState(args: unknown): HapticsState | null {
  if (
    typeof args !== 'object' ||
    args === null ||
    !('intiface_command' in args) ||
    !('speed' in args) ||
    args.intiface_command !== 'speed' ||
    typeof args.speed !== 'number'
  ) {
    return null;
  }

  return new HapticsState(Array(9).fill(args.speed * 255));
}

export default class QRTuberDemoComponent extends Component {
  private _client = new IntifaceHapticsAdapter();
  private _tracker = new QRCodeFinder();
  private _videoHandler = new ContentVideoHandler();

  state = {
    tracking: false,
    trackedValue: "",
    intifaceState: false
  };

  constructor(props) {
    super(props);
    this._tracker.addListener(QRCodeFinder.DETECTION_EVENT, (args) => {
      const state = legacySpeedMessageToState(args);
      if (state !== null) {
        void this._client.applyState(state);
      }
    });
    this._videoHandler.addListener("videoblob", (blobObj) => {
      if (blobObj["blob_url"] !== undefined) {
        this._tracker.getBlobFromURL(blobObj["blob_url"]).then(() => {
          this._tracker.findQRCode().then((result: any) => {
            if (result.Message !== null) {
              this.setState({ trackedValue: `${result.Message.speed}` });
            }
            this._videoHandler.handleQRCodeFinderReturn(result);
          });
        });
        return true;
      }
    });
  }

  private toggleTracking(state: boolean) {
    if (state) {
      this._videoHandler.startTrackingVideo();
    } else {
      this._videoHandler.stopTrackingVideo();
    }
    this.setState({ tracking: state });
  }

  private async toggleIntifaceConnection(state: boolean) {
    if (state) {
      await this._client.connect();
    } else {
      await this._client.disconnect();
    }
    await this.setState({ intifaceState: state });
  }

  public render() {
    return <>
        <ul>
          <li>Tracking: <b>{this.state.tracking ? "On" : "Off"}</b></li>
          <li>Tracked Value: <b>{this.state.trackedValue}</b></li>
          <li>Intiface State: <b>{this.state.intifaceState ? "Connected" : "Disconnected"}</b></li>
        </ul>

        <div>
          <button onClick={() => this.toggleTracking(true)}>Start Tracking</button><br />
          <button onClick={() => this.toggleTracking(false)}>Stop Tracking</button><br />
          <button onClick={() => this.toggleIntifaceConnection(true)}>Connect Intiface</button><br />
          <button onClick={() => this.toggleIntifaceConnection(false)}>Disconnect Intiface</button><br />
        </div>
      </>;
  }
}
