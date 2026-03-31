// Lyrics fetcher & synced-lyrics display using LRCLIB.net
// Click any line to resync. [ / ] keys nudge ±0.5s.
(function (window) {
  function createLyricsHandler(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return { update() {}, tick() {}, nudge() {}, beatPulse() {}, setMode() {} };

    const lyricsBody = container.querySelector('.lyrics-body');

    let currentTrackKey = '';
    let lines = [];
    let activeIndex = -1;
    let synced = false;
    let anchorTime = 0;
    let userOffset = 0;
    let abortCtrl = null;
    let scrollTarget = null;
    let scrollCurrent = 0;
    let beatTimer = 0;
    let mode = 'center';  // 'center' | 'side' | 'off'
    const STORAGE_PREFIX = 'nova_lyrics_cache_v1:';

    function loadCache(key) {
      try {
        const raw = localStorage.getItem(STORAGE_PREFIX + encodeURIComponent(key));
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    }

    function saveCache(key, data) {
      try {
        localStorage.setItem(STORAGE_PREFIX + encodeURIComponent(key), JSON.stringify(data));
      } catch (e) {
        // ignore storage errors (quota/private mode)
      }
    }

    // ── Parse LRC ─────────────────────────────────────
    function parseSynced(lrc) {
      const out = [];
      for (const raw of lrc.split('\n')) {
        const m = raw.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s?(.*)/);
        if (m) out.push({ time: +m[1] * 60 + +m[2], text: m[3] });
      }
      return out;
    }

    function parsePlain(plain) {
      return plain.split('\n').map(t => ({ time: null, text: t.trim() }));
    }

    // ── Classify line: past lines visible, upcoming hidden ─
    function classFor(i, active) {
      if (i === active) return 'active';
      if (i > active) return 'upcoming';
      const d = active - i;
      if (d === 1) return 'past-1';
      if (d <= 3) return 'past-near';
      return 'past-far';
    }

    // ── Render lines into DOM ─────────────────────────
    function render() {
      if (!lyricsBody) return;
      lyricsBody.innerHTML = '';

      if (!lines.length) {
        container.classList.remove('visible');
        return;
      }

      const frag = document.createDocumentFragment();
      lines.forEach((l, i) => {
        const div = document.createElement('div');
        const text = l.text || '';
        div.className = text ? 'lyrics-line upcoming' : 'lyrics-line empty-line';
        div.textContent = text;
        if (l.time != null) {
          div.addEventListener('click', () => {
            const elapsed = (performance.now() - anchorTime) / 1000;
            userOffset = l.time - elapsed;
            activeIndex = -1;
          });
        }
        frag.appendChild(div);
      });
      lyricsBody.appendChild(frag);

      activeIndex = -1;
      scrollCurrent = 0;
      lyricsBody.scrollTop = 0;
      container.classList.add('visible');
    }

    // ── Smooth scroll (lerped every frame) ────────────
    function smoothScroll() {
      if (scrollTarget == null) return;
      const diff = scrollTarget - scrollCurrent;
      if (Math.abs(diff) < 0.5) {
        lyricsBody.scrollTop = scrollTarget;
        scrollTarget = null;
        return;
      }
      scrollCurrent += diff * 0.06;
      lyricsBody.scrollTop = scrollCurrent;
    }

    // ── Set active line — minimal DOM updates ─────────
    function setActive(idx) {
      if (idx === activeIndex || idx < 0 || idx >= lines.length) return;

      const children = lyricsBody.children;
      const old = activeIndex;
      activeIndex = idx;

      if (old >= 0) {
        const lo = Math.max(0, Math.min(old, idx) - 4);
        const hi = Math.min(children.length - 1, Math.max(old, idx) + 4);
        for (let i = lo; i <= hi; i++) {
          const el = children[i];
          if (el.classList.contains('empty-line')) continue;
          el.className = 'lyrics-line ' + classFor(i, idx);
        }
      } else {
        for (let i = 0; i < children.length; i++) {
          const el = children[i];
          if (el.classList.contains('empty-line')) continue;
          el.className = 'lyrics-line ' + classFor(i, idx);
        }
      }

      // Slam entrance on the newly active line
      const activeEl = children[idx];
      if (activeEl && old !== idx) {
        activeEl.classList.add('slam');
        // Remove slam after animation so transitions work again
        setTimeout(() => activeEl.classList.remove('slam'), 400);
      }

      // Scroll target
      if (activeEl) {
        scrollTarget = activeEl.offsetTop - lyricsBody.clientHeight / 2 + activeEl.offsetHeight / 2;
        scrollCurrent = lyricsBody.scrollTop;
      }
    }

    // ── Fetch from LRCLIB ─────────────────────────────
    async function fetchLyrics(title, artist, signal) {
      const params = new URLSearchParams({ track_name: title, artist_name: artist });
      const res = await fetch(`https://lrclib.net/api/search?${params}`, { signal });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.length) return null;
      return data.find(r => r.syncedLyrics) || data[0];
    }

    function applyLyrics(data) {
      if (data.syncedLyrics) {
        lines = parseSynced(data.syncedLyrics);
        synced = true;
      } else if (data.plainLyrics) {
        lines = parsePlain(data.plainLyrics);
        synced = false;
      }
      render();
    }

    // ── Public: called on livelyCurrentTrack ──────────
    async function update(title, artist) {
      const key = `${title}|||${artist}`;

      anchorTime = performance.now();
      userOffset = 0;

      if (key === currentTrackKey) {
        activeIndex = -1;
        return;
      }

      currentTrackKey = key;
      if (abortCtrl) abortCtrl.abort();
      abortCtrl = new AbortController();

      lines = [];
      synced = false;
      render();

      if (!title) return;

      const cached = loadCache(key);
      if (cached) {
        applyLyrics(cached);
        return;
      }

      try {
        const data = await fetchLyrics(title, artist, abortCtrl.signal);
        if (currentTrackKey !== key) return;
        if (!data) return;
        saveCache(key, data);
        applyLyrics(data);
      } catch (e) {
        if (e.name !== 'AbortError') console.warn('[lyrics]', e);
      }
    }

    // ── Public: call every frame via rAF ─────────────
    function tick() {
      if (mode === 'off') return;
      smoothScroll();
      if (!synced || !lines.length) return;
      const elapsed = (performance.now() - anchorTime) / 1000 + userOffset;
      let idx = 0;
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].time <= elapsed) { idx = i; break; }
      }
      setActive(idx);
    }

    function nudge(seconds) {
      userOffset += seconds;
    }

    // ── Beat pulse — cycle color tints + scale punch ──
    const beatColors = ['beat', 'beat-pink', 'beat-cyan'];
    let beatColorIdx = 0;

    function beatPulse() {
      if (mode === 'off' || activeIndex < 0) return;
      const el = lyricsBody.children[activeIndex];
      if (!el) return;
      el.classList.remove('beat', 'beat-pink', 'beat-cyan');
      const cls = beatColors[beatColorIdx % beatColors.length];
      beatColorIdx++;
      el.classList.add(cls);
      clearTimeout(beatTimer);
      beatTimer = setTimeout(() => el.classList.remove(cls), 180);
    }

    // ── Public: switch layout mode ───────────────────
    function setMode(newMode) {
      mode = newMode;
      container.classList.remove('side', 'off');
      if (mode === 'side') container.classList.add('side');
      if (mode === 'off') {
        container.classList.add('off');
        container.classList.remove('visible');
      }
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === '[') nudge(-0.5);
      if (e.key === ']') nudge(0.5);
    });

    return { update, tick, nudge, beatPulse, setMode };
  }

  window.createLyricsHandler = createLyricsHandler;
})(window);
