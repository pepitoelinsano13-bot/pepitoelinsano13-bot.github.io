/**
 * OMA Ruleta - Motor de Selección Pseudoaleatoria (1995 - 2025)
 * Modos:
 *  - Normal: Sortea entre P1, P2 y P3
 *  - Nacional: Sortea entre P1, P2, P3, P4, P5 y P6
 */

// Constantes de Dominio
const MIN_YEAR = 1995;
const MAX_YEAR = 2025;
const NORMAL_PROBLEMS = ["P1", "P2", "P3"];
const NACIONAL_PROBLEMS = ["P1", "P2", "P3", "P4", "P5", "P6"];

// Estado Global
let state = {
    mode: "normal", // 'normal' | 'nacional'
    level: "Cualquiera",
    currentYear: null,
    currentProblem: null,
    isSpinning: false,
    soundEnabled: true,
    history: [],
    stats: {
        total: 0,
        normalCount: 0,
        nacionalCount: 0,
        yearSum: 0,
        problemFreq: { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, P6: 0 }
    },
    timer: {
        totalSeconds: 3 * 3600, // 3 Horas por defecto
        remainingSeconds: 3 * 3600,
        intervalId: null,
        isRunning: false
    }
};

// Generador de Sonidos Web Audio API
let audioCtx = null;
function initAudio() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playTickSound() {
    if (!state.soundEnabled) return;
    try {
        initAudio();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(700 + Math.random() * 200, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.04);
    } catch (e) {
        // Ignorar si el navegador bloquea audio sin interacción
    }
}

function playWinSound() {
    if (!state.soundEnabled) return;
    try {
        initAudio();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            gain.gain.setValueAtTime(0.08, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.25);
        });
    } catch (e) {}
}

// Algoritmo PRNG: Mulberry32 con Semilla (Opcional) o Criptográfico
function hashString(str) {
    let hash = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        hash = Math.imul(hash ^ str.charCodeAt(i), 3432918353);
        hash = hash << 13 | hash >>> 19;
    }
    return hash >>> 0;
}

function mulberry32(a) {
    return function() {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

let seedPrng = null;
function getRandomValue() {
    if (seedPrng) {
        return seedPrng();
    }
    if (window.crypto && window.crypto.getRandomValues) {
        const arr = new Uint32Array(1);
        window.crypto.getRandomValues(arr);
        return arr[0] / 4294967296;
    }
    return Math.random();
}

/**
 * Realiza el sorteo pseudoaleatorio:
 * 1. Año: entre 1995 y 2025 inclusive (31 valores posibles)
 * 2. Problema:
 *    - Si mode == 'normal' -> entre P1, P2 y P3
 *    - Si mode == 'nacional' -> entre P1, P2, P3, P4, P5 y P6
 */
function computeDraw(mode) {
    const rYear = getRandomValue();
    const yearRange = (MAX_YEAR - MIN_YEAR + 1);
    const chosenYear = MIN_YEAR + Math.floor(rYear * yearRange);

    const problemPool = (mode === "nacional") ? NACIONAL_PROBLEMS : NORMAL_PROBLEMS;
    const rProblem = getRandomValue();
    const problemIndex = Math.floor(rProblem * problemPool.length);
    const chosenProblem = problemPool[problemIndex];

    return {
        year: chosenYear,
        problem: chosenProblem,
        mode: mode
    };
}

// Interfaz y Modos
function setMode(newMode) {
    if (state.isSpinning) return;
    state.mode = newMode;

    const normalBtn = document.getElementById("modeNormalBtn");
    const nacionalBtn = document.getElementById("modeNacionalBtn");
    const rouletteCard = document.getElementById("rouletteCard");
    const modeBadge = document.getElementById("currentModeBadge");
    const spinBtn = document.getElementById("btnSpin");
    const problemSubHint = document.getElementById("problemSubHint");
    const timerLabel = document.getElementById("timerPresetLabel");

    if (newMode === "normal") {
        normalBtn.classList.add("active");
        nacionalBtn.classList.remove("active");
        rouletteCard.classList.remove("nacional-mode");
        modeBadge.className = "badge";
        modeBadge.innerHTML = '<i class="fas fa-shield-alt"></i> MODO NORMAL';
        spinBtn.classList.remove("nacional-cta");
        problemSubHint.textContent = "Entre P1 y P3";
        timerLabel.textContent = "Modo Normal: 3 Horas";
        setTimerPreset(3 * 3600);
    } else {
        nacionalBtn.classList.add("active");
        normalBtn.classList.remove("active");
        rouletteCard.classList.add("nacional-mode");
        modeBadge.className = "badge nacional";
        modeBadge.innerHTML = '<i class="fas fa-trophy"></i> MODO NACIONAL';
        spinBtn.classList.add("nacional-cta");
        problemSubHint.textContent = "Entre P1 a P6";
        timerLabel.textContent = "Modo Nacional: 4 Horas";
        setTimerPreset(4 * 3600);
    }

    saveState();
}

// Animación de Ruleta
function spinRoulette() {
    if (state.isSpinning) return;
    state.isSpinning = true;

    // Configurar semilla si el usuario ingresó una
    const seedInput = document.getElementById("seedInput").value.trim();
    if (seedInput) {
        const numericSeed = hashString(seedInput);
        seedPrng = mulberry32(numericSeed);
    } else {
        seedPrng = null;
    }

    const spinBtn = document.getElementById("btnSpin");
    const yearDisplay = document.getElementById("yearDisplay");
    const problemDisplay = document.getElementById("problemDisplay");
    const resultActions = document.getElementById("resultActions");
    const problemPool = (state.mode === "nacional") ? NACIONAL_PROBLEMS : NORMAL_PROBLEMS;

    spinBtn.disabled = true;
    yearDisplay.classList.add("spinning");
    problemDisplay.classList.add("spinning");
    resultActions.style.display = "none";

    const targetResult = computeDraw(state.mode);
    const duration = 1600; // ms
    const startTime = performance.now();
    let lastTick = 0;

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Disminuir frecuencia de cambio conforme avanza el tiempo (efecto desaceleración)
        const tickInterval = 30 + Math.pow(progress, 2.5) * 160;

        if (currentTime - lastTick > tickInterval) {
            lastTick = currentTime;
            playTickSound();

            const randomYear = MIN_YEAR + Math.floor(Math.random() * (MAX_YEAR - MIN_YEAR + 1));
            const randomProb = problemPool[Math.floor(Math.random() * problemPool.length)];

            yearDisplay.textContent = randomYear;
            problemDisplay.textContent = randomProb;
        }

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Revelar resultado final
            yearDisplay.classList.remove("spinning");
            problemDisplay.classList.remove("spinning");
            
            yearDisplay.textContent = targetResult.year;
            problemDisplay.textContent = targetResult.problem;

            if (state.mode === "nacional") {
                problemDisplay.className = "reel-value highlight-gold";
            } else {
                problemDisplay.className = "reel-value highlight";
            }

            state.currentYear = targetResult.year;
            state.currentProblem = targetResult.problem;
            state.isSpinning = false;
            spinBtn.disabled = false;

            playWinSound();
            onDrawComplete(targetResult);
        }
    }

    requestAnimationFrame(animate);
}

function onDrawComplete(drawResult) {
    const resultActions = document.getElementById("resultActions");
    const summaryText = document.getElementById("resultSummaryText");
    const modeName = drawResult.mode === "nacional" ? "Nacional" : "Normal";

    summaryText.innerHTML = `🎯 Sorteado: <strong>Año ${drawResult.year} — Problema ${drawResult.problem} (${modeName})</strong> ${state.level !== 'Cualquiera' ? '· ' + state.level : ''}`;
    resultActions.style.display = "block";

    // Registrar en Historial
    const entry = {
        id: Date.now(),
        year: drawResult.year,
        problem: drawResult.problem,
        mode: drawResult.mode,
        level: state.level,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    state.history.unshift(entry);
    if (state.history.length > 50) state.history.pop();

    // Actualizar Estadísticas
    state.stats.total++;
    if (drawResult.mode === "normal") state.stats.normalCount++;
    else state.stats.nacionalCount++;
    state.stats.yearSum += drawResult.year;
    state.stats.problemFreq[drawResult.problem] = (state.stats.problemFreq[drawResult.problem] || 0) + 1;

    updateHistoryUI();
    updateStatsUI();
    saveState();
}

// Historial UI
function updateHistoryUI() {
    const list = document.getElementById("historyList");
    if (!list) return;

    if (state.history.length === 0) {
        list.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-dice-d20"></i>
                <p>Todavía no has sorteado ningún problema. ¡Presiona el botón para empezar!</p>
            </div>
        `;
        return;
    }

    list.innerHTML = state.history.map(item => `
        <div class="history-item">
            <div class="history-item-left">
                <span class="history-badge ${item.mode}">${item.mode.toUpperCase()}</span>
                <span class="history-text">Año ${item.year} · ${item.problem}</span>
            </div>
            <span class="history-time">${item.time}</span>
        </div>
    `).join("");
}

function clearHistory() {
    if (confirm("¿Deseas reiniciar el historial de problemas sorteados?")) {
        state.history = [];
        state.stats = {
            total: 0,
            normalCount: 0,
            nacionalCount: 0,
            yearSum: 0,
            problemFreq: { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, P6: 0 }
        };
        updateHistoryUI();
        updateStatsUI();
        saveState();
    }
}

// Estadísticas UI
function updateStatsUI() {
    const totalEl = document.getElementById("statTotalSpins");
    const avgYearEl = document.getElementById("statAvgYear");
    const normRatioEl = document.getElementById("statNormalRatio");
    const nacRatioEl = document.getElementById("statNacionalRatio");
    const freqBars = document.getElementById("freqBars");

    if (!totalEl) return;

    totalEl.textContent = state.stats.total;
    avgYearEl.textContent = state.stats.total > 0 ? Math.round(state.stats.yearSum / state.stats.total) : "--";

    if (state.stats.total > 0) {
        normRatioEl.textContent = Math.round((state.stats.normalCount / state.stats.total) * 100) + "%";
        nacRatioEl.textContent = Math.round((state.stats.nacionalCount / state.stats.total) * 100) + "%";
    } else {
        normRatioEl.textContent = "0%";
        nacRatioEl.textContent = "0%";
    }

    const maxCount = Math.max(...Object.values(state.stats.problemFreq), 1);
    const problems = ["P1", "P2", "P3", "P4", "P5", "P6"];

    freqBars.innerHTML = problems.map(p => {
        const count = state.stats.problemFreq[p] || 0;
        const percent = Math.round((count / maxCount) * 100);
        return `
            <div class="freq-row">
                <span class="freq-label">${p}</span>
                <div class="freq-track">
                    <div class="freq-fill" style="width: ${percent}%;"></div>
                </div>
                <span class="freq-val">${count}</span>
            </div>
        `;
    }).join("");
}

// Búsqueda y Enlaces a OMA Foros
function openOmaForosSearch() {
    if (!state.currentYear || !state.currentProblem) return;

    const queryParts = ["site:omaforos.com.ar", `"${state.currentYear}"`, state.currentProblem];
    if (state.mode === "nacional") {
        queryParts.push("Nacional");
    }
    if (state.level && state.level !== "Cualquiera") {
        queryParts.push(`"${state.level}"`);
    }

    const searchQuery = encodeURIComponent(queryParts.join(" "));
    window.open(`https://www.google.com/search?q=${searchQuery}`, "_blank");
}

function copyChallengeToClipboard() {
    if (!state.currentYear || !state.currentProblem) return;
    const modeName = state.mode === "nacional" ? "Certamen Nacional" : "Modo Normal";
    const text = `🎯 Desafío OMA Seleccionado:\n• Año: ${state.currentYear}\n• Problema: ${state.currentProblem}\n• Modalidad: ${modeName} (${state.mode === 'nacional' ? 'P1 a P6' : 'P1 a P3'})\n${state.level !== 'Cualquiera' ? '• Nivel: ' + state.level + '\n' : ''}• Plataforma: https://pepitoelinsano13-bot.github.io/oma-ruleta/`;

    navigator.clipboard.writeText(text).then(() => {
        alert("¡Desafío copiado al portapapeles!\n\n" + text);
    }).catch(() => {
        prompt("Copia tu desafío:", text);
    });
}

function generateRandomSeed() {
    const randomHex = Math.random().toString(36).substring(2, 9).toUpperCase();
    document.getElementById("seedInput").value = "OMA-" + randomHex;
}

// Cronómetro de Certamen
function setTimerPreset(seconds) {
    if (state.timer.isRunning) toggleTimer(); // Pausar si estaba corriendo
    state.timer.totalSeconds = seconds;
    state.timer.remainingSeconds = seconds;
    renderTimer();
}

function renderTimer() {
    const s = state.timer.remainingSeconds;
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    const formatted = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const mainDisplay = document.getElementById("timerDisplayMain");
    const quickDisplay = document.getElementById("quickTimerDisplay");
    const fill = document.getElementById("timerProgressFill");

    if (mainDisplay) mainDisplay.textContent = formatted;
    if (quickDisplay) quickDisplay.textContent = formatted;

    if (fill && state.timer.totalSeconds > 0) {
        const percent = Math.max(0, (state.timer.remainingSeconds / state.timer.totalSeconds) * 100);
        fill.style.width = `${percent}%`;
    }
}

function toggleTimer() {
    const btn = document.getElementById("timerStartBtn");
    if (state.timer.isRunning) {
        clearInterval(state.timer.intervalId);
        state.timer.isRunning = false;
        if (btn) btn.innerHTML = '<i class="fas fa-play"></i> Continuar';
    } else {
        if (state.timer.remainingSeconds <= 0) {
            state.timer.remainingSeconds = state.timer.totalSeconds;
        }
        state.timer.isRunning = true;
        if (btn) btn.innerHTML = '<i class="fas fa-pause"></i> Pausar';

        state.timer.intervalId = setInterval(() => {
            if (state.timer.remainingSeconds > 0) {
                state.timer.remainingSeconds--;
                renderTimer();
            } else {
                clearInterval(state.timer.intervalId);
                state.timer.isRunning = false;
                if (btn) btn.innerHTML = '<i class="fas fa-play"></i> Iniciar';
                playWinSound();
                alert("⏰ ¡TIEMPO CUMPLIDO! La prueba cronometrada ha finalizado.");
            }
        }, 1000);
    }
}

function resetTimer() {
    if (state.timer.isRunning) toggleTimer();
    state.timer.remainingSeconds = state.timer.totalSeconds;
    renderTimer();
}

function adjustTimerPrompt() {
    const minsInput = prompt("Introduce la duración de entrenamiento en minutos:", Math.round(state.timer.totalSeconds / 60));
    if (minsInput && !isNaN(minsInput) && Number(minsInput) > 0) {
        setTimerPreset(Number(minsInput) * 60);
    }
}

function startTimerWithDrawnProblem() {
    scrollToTimer();
    if (!state.timer.isRunning) {
        toggleTimer();
    }
}

function scrollToTimer() {
    const timerSection = document.getElementById("timerSection");
    if (timerSection) {
        timerSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Asistente IA Gemini
async function requestAiHint() {
    if (!state.currentYear || !state.currentProblem) return;

    const box = document.getElementById("aiHintBox");
    const content = document.getElementById("aiHintContent");
    box.style.display = "block";
    content.innerHTML = `<div class="spinner-loader"><i class="fas fa-circle-notch fa-spin"></i> Generando análisis matemático y pista para el ${state.currentProblem} de ${state.currentYear}...</div>`;

    const promptText = `Eres un entrenador de la Olimpíada Matemática Argentina (OMA). El alumno sorteó el problema ${state.currentProblem} del certamen ${state.mode === 'nacional' ? 'Nacional' : 'Zonal/Regional'} del año ${state.currentYear} (${state.level}). Proporciona: 1) El tipo de rama matemática que suele abordarse (Álgebra, Geometría, Teoría de Números, Combinatoria). 2) Una pista reflexiva (hint) para guiar el razonamiento sin revelar el resultado final. 3) Un consejo clave de resolución. Sé claro, pedagógico y conciso.`;

    try {
        // Consultar backend local si está disponible o sugerencia offline estructurada
        const response = await fetch("/api/hint", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: promptText })
        }).catch(() => null);

        if (response && response.ok) {
            const data = await response.json();
            content.innerHTML = data.reply.replace(/\n/g, "<br>");
        } else {
            // Fallback analítico contextual para entorno estático en GitHub Pages
            setTimeout(() => {
                content.innerHTML = `
                    <strong>💡 Estrategia para ${state.currentProblem} (${state.currentYear} - ${state.mode.toUpperCase()}):</strong><br>
                    • <strong>Estrategia recomendada:</strong> Comienza probando casos pequeños o buscando invariantes y simetrías.<br>
                    • <strong>Pista analítica:</strong> Si es de teoría de números, analiza congruencias modulares o factorización prima. Si es de geometría, busca cuadriláteros cíclicos o semejanza de triángulos.<br>
                    • <strong>Búsqueda directa:</strong> Puedes consultar las discusiones y soluciones en OMA Foros tocando el botón <em>Buscar en OMA Foros</em>.
                `;
            }, 600);
        }
    } catch (e) {
        content.innerHTML = `Explora las soluciones de la comunidad buscando el problema en OMA Foros.`;
    }
}

function closeAiHint() {
    document.getElementById("aiHintBox").style.display = "none";
}

// Persistencia en LocalStorage
function saveState() {
    try {
        const toSave = {
            mode: state.mode,
            level: state.level,
            soundEnabled: state.soundEnabled,
            history: state.history,
            stats: state.stats
        };
        localStorage.setItem("oma_ruleta_state", JSON.stringify(toSave));
    } catch (e) {}
}

function loadState() {
    try {
        const saved = localStorage.getItem("oma_ruleta_state");
        if (saved) {
            const parsed = JSON.parse(saved);
            state.mode = parsed.mode || "normal";
            state.level = parsed.level || "Cualquiera";
            state.soundEnabled = parsed.soundEnabled !== false;
            state.history = parsed.history || [];
            state.stats = parsed.stats || state.stats;
        }
    } catch (e) {}
}

// Inicialización de la App
window.addEventListener("DOMContentLoaded", () => {
    loadState();
    setMode(state.mode);

    // Sonido toggle
    const soundToggle = document.getElementById("soundToggle");
    if (soundToggle) {
        if (state.soundEnabled) soundToggle.classList.add("active");
        soundToggle.addEventListener("click", () => {
            state.soundEnabled = !state.soundEnabled;
            soundToggle.classList.toggle("active", state.soundEnabled);
            saveState();
        });
    }

    // Chips de Nivel
    const levelChips = document.querySelectorAll(".level-chips .chip");
    levelChips.forEach(chip => {
        if (chip.dataset.level === state.level) {
            levelChips.forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
        }
        chip.addEventListener("click", () => {
            levelChips.forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            state.level = chip.dataset.level;
            saveState();
        });
    });

    // Tecla Espacio o Enter para girar
    window.addEventListener("keydown", (e) => {
        if (e.code === "Space" && e.target.tagName !== "INPUT" && e.target.tagName !== "BUTTON") {
            e.preventDefault();
            spinRoulette();
        }
    });

    renderTimer();
    updateHistoryUI();
    updateStatsUI();
});
