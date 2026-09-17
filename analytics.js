// Public site endpoint; no API key or account credentials.
const endpoint = 'https://oiryh.goatcounter.com/count';
const downloadURL = 'Dawn-1.0.3.dmg';

// Downloads remain functional even if analytics or the 3D preview fails to load.
document.querySelectorAll('[data-download]').forEach(button => {
  button.addEventListener('click', () => {
    try {
      window.goatcounter?.count?.({
        path: 'download-dawn-1.0.3',
        title: 'Dawn 1.0.3 download click',
        event: true,
      });
    } finally {
      window.location.href = downloadURL;
    }
  });
});

// Only measure the published site, never local development or previews.
if (endpoint && location.hostname === 'oi-ryh.github.io') {
  window.goatcounter = {
    path: location.pathname, // Do not split pageviews by demo hash or query string.
  };
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://gc.zgo.at/count.js';
  script.dataset.goatcounter = endpoint;
  document.head.appendChild(script);
}
