// URL du worklet SoundTouch depuis jsDelivr (timestretch + pitch en temps réel)
const SOUNDTOUCH_WORKLET_URL =
  "https://cdn.jsdelivr.net/npm/@soundtouchjs/audio-worklet@0.2.1/dist/soundtouch-worklet.js";

const audio = document.getElementById("audio");
const fileInput = document.getElementById("fileInput");
const playPauseBtn = document.getElementById("playPause");
const trackTitleEl = document.getElementById("trackTitle");
const trackArtistEl = document.getElementById("trackArtist");
const fileHintEl = document.getElementById("fileHint");
const tempoSlider = document.getElementById("tempoSlider");
const pitchSlider = document.getElementById("pitchSlider");
const tempoDisplay = document.getElementById("tempoDisplay");
const pitchDisplay = document.getElementById("pitchDisplay");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const timeBarFill = document.getElementById("timeBarFill");
const coverEl = document.getElementById("cover");
const statusTextEl = document.getElementById("statusText");
const statusDotEl = document.querySelector(".status-dot");

let audioCtx = null;
let soundtouchNode = null;
let sourceNode = null;
let initialized = false;

function formatTime(seconds) {
  if (!isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function updateTime() {
  if (!audio) return;
  currentTimeEl.textContent = formatTime(audio.currentTime);
  durationEl.textContent = formatTime(audio.duration || 0);

  if (audio.duration > 0) {
    const ratio = audio.currentTime / audio.duration;
    timeBarFill.style.width = `${Math.min(Math.max(ratio * 100, 0), 100)}%`;
  } else {
    timeBarFill.style.width = "0%";
  }
}

function updateTempoDisplay(value) {
  tempoDisplay.textContent = `${Number(value).toFixed(2)}×`;
}

function updatePitchDisplay(value) {
  const v = Number(value);
  if (v === 0) {
    pitchDisplay.textContent = "0 demi‑ton";
  } else {
    const plural = Math.abs(v) > 1 ? "demi‑tons" : "demi‑ton";
    pitchDisplay.textContent = `${v > 0 ? "+" : ""}${v} ${plural}`;
  }
}

async function initAudioGraphIfNeeded() {
  if (initialized) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    statusTextEl.textContent = "Chargement du moteur de time‑stretching…";

    await audioCtx.audioWorklet.addModule(SOUNDTOUCH_WORKLET_URL);

    soundtouchNode = new AudioWorkletNode(audioCtx, "soundtouch-processor");

    sourceNode = audioCtx.createMediaElementSource(audio);
    sourceNode.connect(soundtouchNode);
    soundtouchNode.connect(audioCtx.destination);

    const tempoParam = soundtouchNode.parameters.get("tempo");
    const pitchSemiParam = soundtouchNode.parameters.get("pitchSemitones");
    const rateParam = soundtouchNode.parameters.get("rate");

    if (tempoParam) tempoParam.value = parseFloat(tempoSlider.value);
    if (pitchSemiParam) pitchSemiParam.value = parseFloat(pitchSlider.value);
    if (rateParam) rateParam.value = 1.0;

    initialized = true;
    statusTextEl.textContent = "Graph audio initialisé (SoundTouch actif)";
    statusDotEl.classList.add("ready");
  } catch (err) {
    console.error("Erreur init AudioWorklet:", err);
    statusTextEl.textContent =
      "Erreur AudioWorklet. Essaie sur Chrome/Edge récents.";
    statusDotEl.classList.remove("ready");
    alert(
      "Impossible d'initialiser le moteur de time‑stretching.
" +
        "Vérifie ton navigateur (Chrome/Edge récents) ou ta connexion réseau (CDN jsDelivr)."
    );
  }
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  audio.src = url;
  audio.load();

  trackTitleEl.textContent = file.name;
  trackArtistEl.textContent = "Fichier local";
  fileHintEl.textContent = `${(file.size / (1024 * 1024)).toFixed(
    1
  )} Mo — lu uniquement dans ton navigateur.`;

  playPauseBtn.disabled = false;
  playPauseBtn.textContent = "Lecture";

  timeBarFill.style.width = "0%";
  currentTimeEl.textContent = "0:00";
  durationEl.textContent = "0:00";
});

playPauseBtn.addEventListener("click", async () => {
  if (!audio.src) {
    alert("Commence par importer un fichier MP3.");
    return;
  }

  await initAudioGraphIfNeeded();

  if (audioCtx && audioCtx.state === "suspended") {
    await audioCtx.resume();
  }

  if (audio.paused) {
    try {
      await audio.play();
      playPauseBtn.textContent = "Pause";
      coverEl.classList.add("playing");
    } catch (err) {
      console.error("Erreur lecture audio:", err);
    }
  } else {
    audio.pause();
    playPauseBtn.textContent = "Lecture";
    coverEl.classList.remove("playing");
  }
});

audio.addEventListener("ended", () => {
  playPauseBtn.textContent = "Lecture";
  coverEl.classList.remove("playing");
});

audio.addEventListener("timeupdate", updateTime);
audio.addEventListener("loadedmetadata", updateTime);

tempoSlider.addEventListener("input", () => {
  const value = parseFloat(tempoSlider.value);
  updateTempoDisplay(value);

  if (soundtouchNode) {
    const param = soundtouchNode.parameters.get("tempo");
    if (param) param.value = value;
  }
});

pitchSlider.addEventListener("input", () => {
  const value = parseFloat(pitchSlider.value);
  updatePitchDisplay(value);

  if (soundtouchNode) {
    const param = soundtouchNode.parameters.get("pitchSemitones");
    if (param) param.value = value;
  }
});

updateTempoDisplay(tempoSlider.value);
updatePitchDisplay(pitchSlider.value);

document.addEventListener("visibilitychange", () => {
  if (document.hidden && audio && !audio.paused) {
    audio.pause();
    playPauseBtn.textContent = "Lecture";
    coverEl.classList.remove("playing");
  }
});
