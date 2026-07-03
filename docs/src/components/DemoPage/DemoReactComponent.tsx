import React, { Component, useState } from 'react';
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
  decodeTimeMs: number | null;
  scanFound: boolean | null;
  intifaceState: boolean;
}

interface QRTuberDemoVideo {
  label: string;
  url: string;
}

interface QRTuberDemoProps {
  videos: QRTuberDemoVideo[];
}

interface QRTuberDemoControlsProps {
  videoElement: HTMLVideoElement | null;
}

class QRTuberDemoControls extends Component<QRTuberDemoControlsProps, QRTuberDemoState> {
  private _adapter = new IntifaceHapticsAdapter();
  private _finder = new QRCodeFinder();
  private _seqTracker = new SequenceTracker();
  private _videoHandler = new ContentVideoHandler();

  state: QRTuberDemoState = {
    tracking: false,
    trackedValue: "",
    decodeTimeMs: null,
    scanFound: null,
    intifaceState: false
  };

  constructor(props: QRTuberDemoControlsProps) {
    super(props);
    this._finder.addListener(QRCodeFinder.DETECTION_EVENT, (result: VisualDecodeResult) => {
      void this.applyPayload(result.payload);
    });
    this._videoHandler.addListener("videoblob", (blobObj) => {
      if (blobObj["blob_url"] !== undefined) {
        void this.processVideoBlob(blobObj["blob_url"]);
      }
    });
  }

  componentDidUpdate(prevProps: QRTuberDemoControlsProps) {
    if (this.state.tracking && prevProps.videoElement !== this.props.videoElement) {
      this._videoHandler.startTrackingVideo(this.props.videoElement ?? undefined);
    }
  }

  componentWillUnmount() {
    this._videoHandler.stopTrackingVideo();
    void this._adapter.disconnect();
  }

  private async processVideoBlob(blobUrl: string) {
    const start = performance.now();

    await this._finder.getBlobFromURL(blobUrl);
    const result = await this._finder.findQRCode();
    const decodeTimeMs = performance.now() - start;

    if (result !== null) {
      this.setState({ decodeTimeMs, scanFound: true, trackedValue: result.payload });
    } else {
      this.setState({ decodeTimeMs, scanFound: false });
    }
    this._videoHandler.handleQRCodeFinderReturn(result);
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
      this._videoHandler.startTrackingVideo(this.props.videoElement ?? undefined);
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
          <li>Decode Time: <b>{this.state.decodeTimeMs === null ? "n/a" : `${this.state.decodeTimeMs.toFixed(1)} ms/frame`}</b></li>
          <li>Scan Result: <b>{this.state.scanFound === null ? "n/a" : this.state.scanFound ? "Found" : "Missing"}</b></li>
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

export default function QRTuberDemoComponent({ videos }: QRTuberDemoProps) {
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const selectedVideo = videos[selectedVideoIndex] ?? videos[0];

  if (selectedVideo === undefined) {
    return null;
  }

  return <>
    <div style={{ textAlign: "center" }}>
      <label>
        Test Video{" "}
        <select
          onChange={(event) => setSelectedVideoIndex(Number(event.currentTarget.value))}
          value={selectedVideoIndex}
        >
          {videos.map((video, index) => (
            <option key={video.url} value={index}>{video.label}</option>
          ))}
        </select>
      </label>
      <br />
      <video
        autoPlay
        controls
        key={selectedVideo.url}
        loop
        muted
        playsInline
        ref={setVideoElement}
        src={selectedVideo.url}
        style={{ maxWidth: "100%", width: "640px" }}
      />
    </div>

    <QRTuberDemoControls videoElement={videoElement} />
  </>;
}
