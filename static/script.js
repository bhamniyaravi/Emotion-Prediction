(() => {
  "use strict";

  const EMOTIONS = [
    { key: "sadness",  label: "sadness",  emoji: "😢", color: "var(--c-sadness)",  angle: 0   },
    { key: "joy",      label: "joy",      emoji: "😄", color: "var(--c-joy)",      angle: 60  },
    { key: "love",     label: "love",     emoji: "❤️", color: "var(--c-love)",     angle: 120 },
    { key: "anger",    label: "anger",    emoji: "😠", color: "var(--c-anger)",    angle: 180 },
    { key: "fear",     label: "fear",     emoji: "😨", color: "var(--c-fear)",     angle: 240 },
    { key: "surprise", label: "surprise", emoji: "😲", color: "var(--c-surprise)", angle: 300 },
  ];

  const $ = (id) => document.getElementById(id);
  const textInput   = $("text-input");
  const charCount    = $("char-count");
  const analyzeBtn   = $("analyze-btn");
  const statusLine   = $("status-line");
  const spokesEl     = $("spokes");
  const ledgerEl      = $("ledger");
  const historyEl     = $("history");
  const coreEmoji     = $("core-emoji");
  const coreLabel     = $("core-label");
  const coreConfidence = $("core-confidence");
  const compassCore   = $("compass-core");

  let history = [];

  /* ---------- build the compass spokes + ledger rows once ---------- */
  function buildSpokes() {
    spokesEl.innerHTML = "";
    EMOTIONS.forEach((e) => {
      const spoke = document.createElement("div");
      spoke.className = "spoke";
      spoke.dataset.key = e.key;
      spoke.style.transform = `rotate(${e.angle}deg)`;
      spoke.style.setProperty("--fill-color", e.color);

      spoke.innerHTML = `
        <div class="spoke__track"></div>
        <div class="spoke__fill" style="--fill-color:${e.color}"></div>
        <div class="spoke__tag" style="--counter-rotate:${-e.angle}deg">${e.emoji} ${e.label}</div>
      `;
      spokesEl.appendChild(spoke);
    });
  }

  function buildLedgerSkeleton() {
    ledgerEl.innerHTML = EMOTIONS
      .map(
        (e) => `
        <div class="ledger-row" data-key="${e.key}">
          <span class="ledger-emoji">${e.emoji}</span>
          <span class="ledger-name">${e.label}</span>
          <span class="ledger-bar"><span class="ledger-bar__fill" style="--fill-color:${e.color}"></span></span>
          <span class="ledger-pct">—</span>
        </div>`
      )
      .join("");
  }

  /* ---------- char counter ---------- */
  textInput.addEventListener("input", () => {
    charCount.textContent = `${textInput.value.length} / 2000`;
  });

  /* ---------- submit on Cmd/Ctrl+Enter ---------- */
  textInput.addEventListener("keydown", (ev) => {
    if ((ev.metaKey || ev.ctrlKey) && ev.key === "Enter") {
      ev.preventDefault();
      runAnalysis();
    }
  });

  analyzeBtn.addEventListener("click", runAnalysis);

  /* ---------- core flow ---------- */
  async function runAnalysis() {
    const text = textInput.value.trim();
    if (!text) {
      setStatus("Type something first — even a short line works.", "error");
      textInput.focus();
      return;
    }

    setLoading(true);
    setStatus("Reading the signal…", "active");

    try {
      const res = await fetch("/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (res.status === 503) {
        setStatus("The model isn't ready yet. Wait a few seconds and try again.", "error");
        return;
      }
      if (!res.ok) {
        setStatus("Something interrupted the reading. Try again.", "error");
        return;
      }

      const data = await res.json();
      applyResult(data);
      pushHistory(data);
      setStatus("Reading complete.", "");
    } catch (err) {
      setStatus("Couldn't reach the instrument. Check your connection and try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  function setLoading(isLoading) {
    analyzeBtn.disabled = isLoading;
    analyzeBtn.classList.toggle("is-loading", isLoading);
    spokesEl.classList.toggle("is-scanning", isLoading);
  }

  function setStatus(msg, kind) {
    statusLine.textContent = msg;
    statusLine.classList.remove("is-error", "is-active");
    if (kind === "error") statusLine.classList.add("is-error");
    if (kind === "active") statusLine.classList.add("is-active");
  }

  function applyResult(data) {
    const probs = data.all_probabilities;
    const dominantKey = data.prediction_emotion;
    const dominant = EMOTIONS.find((e) => e.key === dominantKey) || EMOTIONS[0];

    // spokes
    EMOTIONS.forEach((e) => {
      const spoke = spokesEl.querySelector(`.spoke[data-key="${e.key}"]`);
      const fill = spoke.querySelector(".spoke__fill");
      const pct = Math.max(0, Math.min(1, probs[e.key] ?? 0));
      fill.style.height = `${(pct * 100).toFixed(1)}%`;
      spoke.classList.toggle("is-dominant", e.key === dominantKey);
    });

    // ledger, sorted by probability desc
    const sorted = [...EMOTIONS].sort((a, b) => (probs[b.key] ?? 0) - (probs[a.key] ?? 0));
    sorted.forEach((e) => {
      const row = ledgerEl.querySelector(`.ledger-row[data-key="${e.key}"]`);
      ledgerEl.appendChild(row); // reorder in DOM
      const pct = probs[e.key] ?? 0;
      row.querySelector(".ledger-bar__fill").style.width = `${(pct * 100).toFixed(1)}%`;
      row.querySelector(".ledger-pct").textContent = `${(pct * 100).toFixed(1)}%`;
      row.classList.toggle("is-dominant", e.key === dominantKey);
    });

    // core dial
    coreEmoji.textContent = dominant.emoji;
    coreEmoji.style.transform = "scale(0.6)";
    requestAnimationFrame(() => {
      coreEmoji.style.transform = "scale(1)";
    });
    coreLabel.textContent = dominant.label;
    coreConfidence.textContent = `${(data.confidence * 100).toFixed(1)}%`;
    compassCore.style.borderColor = dominant.color;
  }

  function pushHistory(data) {
    const dominant = EMOTIONS.find((e) => e.key === data.prediction_emotion) || EMOTIONS[0];
    history.unshift({ text: data.text, emoji: dominant.emoji, color: dominant.color });
    history = history.slice(0, 6);
    renderHistory();
  }

  function renderHistory() {
    historyEl.innerHTML = history
      .map(
        (h, i) => `
        <button class="history-chip" style="--chip-color:${h.color}" data-idx="${i}" type="button">
          ${h.emoji} ${escapeHtml(h.text.slice(0, 34))}${h.text.length > 34 ? "…" : ""}
        </button>`
      )
      .join("");

    historyEl.querySelectorAll(".history-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const idx = Number(chip.dataset.idx);
        textInput.value = history[idx].text;
        charCount.textContent = `${textInput.value.length} / 2000`;
        runAnalysis();
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------- init ---------- */
  buildSpokes();
  buildLedgerSkeleton();
})();
