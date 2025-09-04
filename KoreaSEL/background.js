chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({
      url: 'https://koreasel.mirseo.dev/welcome'
    });
  }
});