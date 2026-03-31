/*
Reusable now-playing handler for browser projects.
Usage:
  const handler = createNowPlayingHandler({
    trackContainer: '#track-container',
    albumArt: '#albumart',
    title: '#track-title',
    artist: '#track-artist',
    defaultBackground: 'media/background.jpg'
  });

  // When you receive Lively's current track payload (JSON string) call:
  handler(data);
*/
(function (window) {
  function createNowPlayingHandler(opts = {}) {
    const sel = {
      trackContainer: opts.trackContainer || '#track-container',
      albumArt: opts.albumArt || '#albumart',
      title: opts.title || '#track-title',
      artist: opts.artist || '#track-artist',
    };

    const trackContainer = document.querySelector(sel.trackContainer);
    const headerTitle = document.querySelector(sel.title);
    const headerArtist = document.querySelector(sel.artist);

    return function livelyCurrentTrack(data) {
      let obj = typeof data === 'string' ? JSON.parse(data) : data;
      if (obj != null) {
        if (headerTitle) headerTitle.innerText = obj.Title || '';
        if (headerArtist) headerArtist.innerText = obj.Artist || '';
        if (trackContainer) trackContainer.classList.add('show');
      } else {
        if (trackContainer) trackContainer.classList.remove('show');
        if (headerTitle) headerTitle.innerText = '';
        if (headerArtist) headerArtist.innerText = '';
      }
    };
  }

  window.createNowPlayingHandler = createNowPlayingHandler;
})(window);
