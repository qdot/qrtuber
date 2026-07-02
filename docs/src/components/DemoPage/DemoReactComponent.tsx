import React, { Component } from 'react';
import {
  ContentVideoHandler,
  IntifaceHapticsAdapter,
  parseFrame,
  QRCodeFinder,
  SequenceTracker,
  type VisualDecodeResult,
} from 'qrtuber';

interface QRTuberDemoState {
  tracking: boolean;
  trackedValue: string;
  intifaceState: boolean;
}

export default class QRTuberDemoComponent extends Component<Record<string, never>, QRTuberDemoState> {
  private _adapter = new IntifaceHapticsAdapter();
  private _finder = new QRCodeFinder();
  private _seqTracker = new SequenceTracker();
  private _videoHandler = new ContentVideoHandler();

  state: QRTuberDemoState = {
    tracking: false,
    trackedValue: "",
    intifaceState: false
  };

  constructor(props: Record<string, never>) {
    super(props);
    this._finder.addListener(QRCodeFinder.DETECTION_EVENT, (result: VisualDecodeResult) => {
      void this.applyPayload(result.payload);
    });
    this._videoHandler.addListener("videoblob", (blobObj) => {
      if (blobObj["blob_url"] !== undefined) {
        this._finder.getBlobFromURL(blobObj["blob_url"]).then(() => {
          this._finder.findQRCode().then((result) => {
            if (result !== null) {
              this.setState({ trackedValue: result.payload });
            }
            this._videoHandler.handleQRCodeFinderReturn(result);
          });
        });
      }
    });
  }

  private async applyPayload(payload: string) {
    const frame = parseFrame(payload);
    if (frame === null || !this._seqTracker.accept(frame)) {
      return;
    }

    await this._adapter.applyState(frame.state);
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
      await this._adapter.connect();
    } else {
      this._seqTracker.reset();
      await this._adapter.disconnect();
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
