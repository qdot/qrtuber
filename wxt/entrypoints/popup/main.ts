import './style.css';
import qrtuberLogo from '@/assets/logo.png';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <a href="https://wxt.dev" target="_blank">
      <img src="${qrtuberLogo}" class="logo" alt="QRTuber logo" />
    </a>
    <h1>QRTuber</h1>
    <div class="card">
      <button id="start" type="button">Start Tracking</button>
      <button id="stop" type="button">Stop Tracking</button>
      <button id="connect" type="button">Connect to Intiface</button>
      <button id="disconnect" type="button">Disconnect from Intiface</button>
    </div>
  </div>
`;

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById("find_video")?.addEventListener("click", () =>
    // ...query for the active tab...
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, tabs => {
      // ...and send a request for the DOM info...
      chrome.tabs.sendMessage(
        tabs[0].id!,
        { from: 'popup', subject: 'DOMInfo' });
    })
  );
});
