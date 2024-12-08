class QRTuberHTTPForwarder {
  constructor() {
    
  }

  public handleDetection(_: string, args: any) {
    fetch("http://localhost:3000/qrcode", {
      method: "POST",
      body: JSON.stringify(args)
    })
  }
}