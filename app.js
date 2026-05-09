// =====================================================
// 🌍 0. GLOBAL BASE START
// ===================================================== 

// ============================
// 🧠 CORE STATE
// ============================
let SPI = 50;
let lastSPI = null;
let lastConditions = {};
let currentSession = null;

// ============================
// 🌍 LOCATION + MAP
// ============================
let userLocation = { lat: null, lon: null }; 
let mapInstance = null; 
let userMarker = null;
const userIcon = L.icon({
    iconUrl: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
    iconSize: [36, 36],
    iconAnchor: [18, 36]
});

const dropIcon = L.icon({
    iconUrl: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
    iconSize: [24, 24],
    iconAnchor: [12, 24]
});

const scoutIcon = L.icon({
    iconUrl: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png',
    iconSize: [28, 45],
    iconAnchor: [14, 45]
});
let scoutMarkers = [];
// ============================
// 🧭 COMPASS
// ============================
let compassHeading = null;
let windDir = 0;
let diff = 0;

// ============================
// 🌡️ ENVIRONMENT DATA
// ============================
const ENV = {
    air: null,
    surface: null,
    bottom: null,
    pressure: null,
    wind: null,
    cloud: null,
    light: null,
    depth: null,
    oxygen: null
};

let forecastData = [
    { date: "Today", spi: 60 },
    { date: "Tomorrow", spi: 72 },
    { date: "Day 3", spi: 78 }
];

const SOURCE = {
    air: "none",
    surface: "none",
    bottom: "none",
    pressure: "none",
    wind: "none",
    cloud: "none",
    light: "none",
    depth: "none",
    oxygen: "none"
};

// ============================
// 📊 SCORES
// ============================
let envScore = 0;
let confScoreValue = 0;
let score = 50;

// ============================
// 📈 HISTORY TRACKING
// ============================
let tempHistory = [];
let pressureHistory = [];

// ============================
// 🌊 VISUAL ENGINE
// ============================
let canvas, ctx;
let bubbles = [];
let ripples = [];
let hotspots = [];
let splashRipples = [];
let bubbleIntensity = 0.7;

// ============================
// 💧 SPLASH SYSTEM
// ============================
let splashActive = true;
let splashCanvas;
let splashCtx;
let splashBubbles = [];

// ============================
// 🎣 SCOUT + DROPS
// ============================
let scoutData = {};
let drops = [];
let retryCount = 0;
window.scoutMarkers = window.scoutMarkers || [];
window.dropMarkers = window.dropMarkers || [];

// ============================
// 🌡️ TEMP MODEL
// ============================
let tempModel = {
    surface: null,
    bottom: null,
    source: "forecast"
};

// ============================
// 🎨 COLORS
// ============================
const GREEN = "#00ffa6";
const ORANGE = "#ffc400";
const RED = "#ff3b3b";
const BLUE = "#00bfff";
const WHITE = "#ffffff";

// =====================================================
// 🌍 0. GLOBAL BASE END
// =====================================================
let scouts = [];

    try {
        scouts = JSON.parse(localStorage.getItem("scouts")) || [];
    } catch (e) {
        console.warn("⚠️ Corrupt scout storage, resetting...");
        scouts = [];
    }

// =====================================================
// 🧩 2. UI HELPERS
// =====================================================

// ================= ICON COLOR ENGINE ================= 
function setIcon(iconName, value, rules) {
    const icon = document.querySelector(`[data-lucide="${iconName}"]`);
    if (!icon) return;

    for (const r of rules) {
        if (value >= r.min && value <= r.max) {
            icon.style.stroke = r.color;
            return;
        }
    }

    icon.style.stroke = GREEN;
}

// ================= SCORE COLOR ================= 
function getScoreColor(value) {
    if (value >= 80) return "#00ff9c";
    if (value >= 60) return "#ffd700";
    return "#ff4d4d";
}

// ================= WIND TEXT ================= 
function getWindDirectionText(deg) {
    if (deg >= 45 && deg < 135) return "Wind → East bank";
    if (deg >= 135 && deg < 225) return "Wind → South bank";
    if (deg >= 225 && deg < 315) return "Wind → West bank";
    return "Wind → North bank";
}

// ================= STORE SCOUT ================= 
let originalScoutHTML = "";

function storeScoutScreen() {
    const el = document.getElementById("scoutScreen");
    if (!el) return;

    originalScoutHTML = el.innerHTML;
    el.classList.add("hidden");
}

// ================= COMPASS TICKS ================= 
function createTicks() {
    const container = document.getElementById("compassTicks");
    if (!container) return;

    for (let i = 0; i < 360; i += 5) {
        const tick = document.createElement("div");
        tick.className = "tick";

        if (i % 90 === 0) tick.classList.add("tick-major");
        else if (i % 15 === 0) tick.classList.add("tick-medium");
        else tick.classList.add("tick-small");

        tick.dataset.angle = i;
        tick.style.transform =
            `translate(-50%, -50%) rotate(${i}deg) translateY(-125px)`;

        container.appendChild(tick);
    }
}

// ================= GPS POSITION =================

function positionDirections() {
    const labels = document.querySelectorAll(".direction-label");
    const radius = 130; // adjust based on your compass size

    labels.forEach(label => {
        const angle = parseFloat(label.dataset.angle);
        const rad = (angle - 90) * (Math.PI / 180);

        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;

        label.style.transform = `translate(${x}px, ${y}px)`;
    });
}


// ================= HOLD INTERACTION ================= 
    function setupHold(elementId, callback) {
    const el = document.getElementById(elementId);
    if (!el) return;

    let timer;

    el.addEventListener("mousedown", () => {
        timer = setTimeout(callback, 600);
    });

    el.addEventListener("mouseup", () => clearTimeout(timer));
    el.addEventListener("mouseleave", () => clearTimeout(timer)); }

// ================= INSIGHTS ================= 
function showENVInsight() {
    alert("ENV Insight coming soon..."); }

function showCONFInsight() {
    alert("Confidence Insight coming soon..."); }

// =====================================================
// 🧩 2. UI HELPERS END
// =====================================================

// =====================================================
// 🚀 3. APP BOOT
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

    // ============================
    // 🧹 CLEAR SCOUTS
    // ============================
    document.getElementById("clearBtn")?.addEventListener("click", () => {
        if (!confirm("Clear all scouts?")) return;

        scouts = [];
        localStorage.removeItem("scouts");
        localStorage.setItem("scouts", JSON.stringify([]));       

        // 🔥 remove scout markers safely
        if (window.scoutMarkers && mapInstance) {
            window.scoutMarkers.forEach(m => mapInstance.removeLayer(m));
            window.scoutMarkers = [];
        }

        console.log("🧹 Scouts cleared");
        alert("All scouts cleared");
    });

    // ============================
    // 🎯 CLEAR DROPS (NEW)
    // ============================
    document.getElementById("clearDropsBtn")?.addEventListener("click", () => {
    if (!confirm("Clear all drops?")) return;

    // 🔥 CLEAR MEMORY
    drops = [];

    // 🔥 REMOVE STORAGE COMPLETELY (not set empty)
    localStorage.removeItem("drops");

    // 🔥 CLEAR MARKERS
    if (window.dropMarkers && mapInstance) {
        window.dropMarkers.forEach(m => mapInstance.removeLayer(m));
        window.dropMarkers = [];
    }

    console.log("🎯 Drops FULLY cleared");
    alert("All drops cleared");
});


    // ============================
    // 🔧 INIT CORE
    // ============================
    loadDrops();   // 🔥 restores drops
    setupScoutOptions();

    // =============================
    // 🌊 SPLASH INIT
    // =============================
    splashCanvas = document.getElementById("splashCanvas");
    splashCtx = splashCanvas?.getContext("2d");

    resizeSplash();

    splashBubbles = [];
    for (let i = 0; i < 40; i++) {
        splashBubbles.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            r: Math.random() * 3 + 1,
            speed: Math.random() * 0.5 + 0.2
        });
    }

    animateSplash();
    initSplashBubbles();

    // =============================
    // 🎯 UI SETUP
    // =============================
    createTicks();
    positionDirections();
    storeScoutScreen();

    // =============================
    // 🎯 UI INTERACTIONS
    // =============================
    setupHold("envScore", showENVInsight);
    setupHold("confScore", showCONFInsight);

    // =============================
    // 🧭 INPUT SYSTEMS
    // =============================
    document.body.addEventListener("touchstart", enableCompass, { once: true });
    document.body.addEventListener("click", enableCompass, { once: true });

    // =============================
    // ⏳ SPLASH CONTROL
    // =============================
    setTimeout(() => {

        splashActive = false;

        const splash = document.getElementById("splash");
        const main = document.querySelector(".main");

        if (splash) splash.style.opacity = "0";

        setTimeout(() => {

            if (splash) splash.style.display = "none";
            if (main) main.classList.add("main-visible");

            // =============================
            // 🚀 START SYSTEMS
            // =============================
            startApp();
            initGPS();
            fetchWeatherSafe();

            setInterval(fetchWeatherSafe, 120000);

        }, 400);
    });
 });

// =====================================================
// 🚀 3. APP BOOT END
// =====================================================

// =====================================================
// 🚀 MAIN APP ENGINE
// =====================================================

function startApp() {
    canvas = document.getElementById("waterGraph");
    ctx = canvas ? canvas.getContext("2d") : null;

    if (!canvas || !ctx) {
        console.error("Canvas not ready");
        return;
    }

    resizeCanvas();
    animate();

    generateHotspots();
    setInterval(generateHotspots, 10000);
    setInterval(ripple, 3000);
}

function resizeCanvas() {
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;

    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
}
// =====================================================
// 🚀 MAIN APP ENGINE END
// =====================================================


// =====================================================
// 💧 4. SPLASH SYSTEM
// =====================================================



// ================= RESIZE ================= 
function resizeSplash() {
    if (!splashCanvas) return;
    splashCanvas.width = window.innerWidth;
    splashCanvas.height = window.innerHeight; }

window.addEventListener("resize", resizeSplash);

// ================= RIPPLE ================= 
function createSplashRipple() {
    splashRipples.push({
        x: Math.random() * splashCanvas.width,
        y: Math.random() * splashCanvas.height,
        size: 0,
        alpha: 0.5
    });
}

// ================= BUBBLES ================= 
function initSplashBubbles() {
    splashBubbles = []; // ✅ FIXED

    for (let i = 0; i < 40; i++) {
        splashBubbles.push({
            x: Math.random() * splashCanvas.width,
            y: Math.random() * splashCanvas.height,
            r: Math.random() * 3 + 1,
            speed: Math.random() * 0.5 + 0.2
        });
    }
}

// =====================================================
// 💧 4. SPLASH SYSTEM END
// =====================================================

// =====================================================
// 🧭 5. COMPASS SYSTEM
// =====================================================

function getDirection(deg) {
    if (deg >= 337 || deg < 23) return "N";
    if (deg < 68) return "NE";
    if (deg < 113) return "E";
    if (deg < 158) return "SE";
    if (deg < 203) return "S";
    if (deg < 248) return "SW";
    if (deg < 293) return "W";
    return "NW";
}

function enableCompass() {

    if (typeof DeviceOrientationEvent.requestPermission === "function") {

        DeviceOrientationEvent.requestPermission()
            .then(response => {

                if (response === "granted") {

                    window.addEventListener("deviceorientation", e => {
                        if (e.alpha !== null) {
                            compassHeading = 360 - e.alpha;
                        }
                    });

                }
            })
            .catch(console.error);

    } else {

        window.addEventListener("deviceorientation", e => {
            if (e.alpha !== null) {
                compassHeading = 360 - e.alpha;
            }
        });
    }
}

function updateCompass(heading) {

    if (heading == null) return;

    const compass = document.getElementById("compassRing");
    if (compass) {
        compass.style.transform = `rotate(${-heading}deg)`;
    }

    updateDirectionTicks(heading);

    if (typeof windDir !== "undefined") {
        setFishingZone(windDir);
    }
}

function updateDirectionTicks(heading) {
    const ticks = document.querySelectorAll("#compassTicks .tick");

    ticks.forEach(tick => {
        const angle = parseFloat(tick.dataset.angle);
        const diff = Math.abs(angle - heading);

        // Normalize difference (wrap around 360)
        const adjusted = Math.min(diff, 360 - diff);

        if (adjusted < 5) {
            tick.style.opacity = "1";
            tick.style.height = "14px";
        } else if (adjusted < 15) {
            tick.style.opacity = "0.6";
            tick.style.height = "10px";
        } else {
            tick.style.opacity = "0.2";
            tick.style.height = "6px";
        }
    });
}

// =====================================================
// 🧭 5. COMPASS SYSTEM END
// =====================================================

// =====================================================
// 🧭 6. MAIN APP ENGINE START
// =====================================================

// =====================================================
// 🎯 7. TACTICAL ENGINE
// =====================================================

// ================= CONDITION ================= 
function getConditionText(SPI, envScore) {

    const score = (SPI + envScore) / 2;

    if (score > 85) return "🔥 Conditions are excellent — fish should feed";
    if (score > 70) return "👍 Conditions are good — fish active";
    if (score > 55) return "👌 Conditions are fair — some movement";
    if (score > 45) return "⚠️ Conditions are slow — bites limited";
    if (score > 30) return "⚠️ Very slow - expect minimal activity";

    return "❄️ Tough conditions — very quiet"; }

// ================= ZONE ================= 
function getZoneText(SPI, light, depth, wind) {

    if (SPI > 75 && wind > 5) return "📍 Focus shallow windward zones";
    if (light > 70) return "📍 Fish deeper cooler water";
    if (depth >= 2 && depth <= 5) return "📍 Target mid-depth transitions";

    return "📍 Search structure and edges"; }

// ================= CONFIDENCE ================= 
function getConfidenceText(SPI, confScore) {

    if (SPI > 75 && confScore > 75)
        return "🧠 Stay on your spots — be patient";

    if (SPI > 60)
        return "🧠 Give it time before changing";

    if (SPI < 50)
        return "🧠 Consider changing approach";

    return "🧠 Monitor and adjust if needed"; }

// ================= MOMENTUM ================= 
function getXFactor(SPI, prevSPI) {

    if (!prevSPI) return null;

    const diff = SPI - prevSPI;

    if (diff > 8) return "⚡ Conditions improving — get ready";
    if (SPI > 85) return "🚀 Prime feeding window now";

    return null;
}

// ================= MAIN UPDATE ================= 
function updateTacticalBar(SPI, envScore, confScore, ENV, prevSPI, forecastData) {

    const lines = [
        getConditionText(SPI, envScore),
        getZoneText(SPI, ENV.light, ENV.depth, ENV.wind),
        getConfidenceText(SPI, confScore)
    ];

    // ================= WINDOW =================
    const window = getStableWindow(forecastData);
    const windowText = getWindowText(window);

    if (windowText) {
        lines.splice(1, 0, SPI > 80 ? "🔥 " + windowText : windowText);
    }

    // ================= MOMENTUM =================
    const extra = getXFactor(SPI, prevSPI);
    if (extra) lines.push(extra);

    const el = document.getElementById("tactical");
    if (el) el.innerText = lines.join("\n"); }

// =====================================================
// 🎯 7. TACTICAL ENGINE END
// =====================================================

// =====================================================
// 🔒 8. WINDOW ENGINE
// =====================================================

function getBestFishingWindow(forecastData) {

    if (!forecastData || forecastData.length < 3) return null;

    let bestScore = 0;
    let bestWindow = null;

    for (let i = 0; i < forecastData.length - 2; i++) {

        const avg =
            (forecastData[i].spi +
             forecastData[i+1].spi +
             forecastData[i+2].spi) / 3;

        if (avg > bestScore) {
            bestScore = avg;
            bestWindow = [
                forecastData[i].date,
                forecastData[i+2].date
            ];
        }
    }

    return bestWindow;
}

function getStableWindow(forecastData) {

    try {
        const stored = JSON.parse(localStorage.getItem("bestWindow"));

        if (Array.isArray(stored) && stored.length === 2) {
            return stored;
        }
    } catch {}

    const window = getBestFishingWindow(forecastData);

    if (window) {
        localStorage.setItem("bestWindow", JSON.stringify(window));
    }

    return window;
}

function getWindowText(window, forecastData) {

    if (!window || !forecastData) return null;

    const avgSPI = forecastData
        .slice(0, 3)
        .reduce((sum, d) => sum + d.spi, 0) / 3;

    if (avgSPI < 50) {
        return `⚠️ Weak window: ${window[0]} → ${window[1]}`;
    }

    if (avgSPI < 65) {
        return `🎯 Moderate window: ${window[0]} → ${window[1]}`;
    }

    return `🔥 Strong feeding window: ${window[0]} → ${window[1]}`; 
}

// =====================================================
// 🔒 8. WINDOW ENGINE END
// =====================================================

// =====================================================
// 🧭 9. ANIMATE START
// =====================================================

function animateSplash() {

  if (!splashCtx) return;

  splashCtx.clearRect(0, 0, splashCanvas.width, splashCanvas.height);

  let w = splashCanvas.width;
  let h = splashCanvas.height;

  let t = Date.now() * 0.002;

  // 🌊 MULTI SONAR RINGS
  for (let i = 0; i < 3; i++) {

    let radius = ((Math.sin(t + i) + 1) * 60) + (i * 40);

    splashCtx.beginPath();
    splashCtx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);

    splashCtx.strokeStyle = `rgba(0,255,156,${0.25 - i * 0.07})`;
    splashCtx.lineWidth = 2;
    splashCtx.stroke();
  }

  // 💨 FLOATING BUBBLES (SMOOTH, NOT RANDOM)
  for (let i = splashBubbles.length - 1; i >= 0; i--) {

    let b = splashBubbles[i];

    b.y -= b.speed;

splashCtx.beginPath();
splashCtx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.2, 0, Math.PI * 2); 
      
// 1. transparent fill
splashCtx.fillStyle = "rgba(255,255,255,0.3)"; splashCtx.fill();

// 2. soft outer glow
splashCtx.shadowBlur = 12;
splashCtx.shadowColor = "rgba(180, 240, 255, 0.25)";

// 3. bubble edge (MOST IMPORTANT)
splashCtx.strokeStyle = "rgba(255,255,255,0.25)"; splashCtx.lineWidth = 1; splashCtx.stroke();

// reset shadow
splashCtx.shadowBlur = 0;

    if (b.y < 0) {
        splashBubbles[i] = {
            x: Math.random() * splashCanvas.width,
            y: splashCanvas.height,
            r: Math.random() * 3 + 1,
            speed: Math.random() * 0.5 + 0.2
        };
    }
}
    
for (let i = splashRipples.length - 1; i >= 0; i--) {

    let b = splashRipples[i];

    b.size += 0.8;       // ✅ FIXED
    b.alpha *= 0.98;

    splashCtx.beginPath();
    splashCtx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
    splashCtx.fillStyle = `rgba(255,255,255,${b.alpha})`;
    splashCtx.fill();

    if (b.alpha < 0.02) {
        splashRipples.splice(i, 1);
    }
}


  // 🌫️ DEPTH GLOW CENTER
  let glow = splashCtx.createRadialGradient(
    w / 2, h / 2, 10,
    w / 2, h / 2, 200
  );

  glow.addColorStop(0, "rgba(0,255,156,0.15)");
  glow.addColorStop(1, "rgba(0,0,0,0)");

  splashCtx.fillStyle = glow;
  splashCtx.fillRect(0, 0, w, h);

  requestAnimationFrame(animateSplash);
}

// =====================================================
// 🧭 9. ANIMATE END
// =====================================================


// =====================================================
// 🌊 VISUAL ENGINE
// =====================================================

function ripple() {
    ripples.push({
        r: 0,
        alpha: 0.3,
        x: canvas.width / 2,
        y: canvas.height * 0.7
    });
}


function spawnBubble() {

    if (!canvas || hotspots.length === 0) return;

    const h = hotspots[Math.floor(Math.random() * hotspots.length)];

    let spiFactor = SPI / 100;

    bubbles.push({
        x: h.x,
        y: canvas.height,

        size: (Math.random() * 4 + 2) * (0.6 + spiFactor),

        speed: (Math.random() * 0.8 + 0.3) * (0.5 + spiFactor),

        drift: (Math.random() - 0.5) * 0.6,

        alpha: 0.25 + (spiFactor * 0.3)
    });
}

function animate() {

    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (typeof updateDirectionTicks === "function") {
    updateDirectionTicks(compassHeading || 0 );
    }
    
    let spawnRate = 0.02 + (bubbleIntensity * 0.08);
    if (Math.random() < spawnRate) {
        spawnBubble();
    }

bubbles.forEach((b, i) => {

    if (b.x == null || b.y == null) return;

    // 🌊 Movement
    b.y -= b.speed;
    b.x += b.drift;

    // 🌊 Natural wobble (buoyancy effect)
    b.x += Math.sin(b.y * 0.02) * 0.3;

    const size = b.size || 6;

    if (!isFinite(b.x) || !isFinite(b.y) || !isFinite(size)) return;

    // 🎯 REALISTIC BUBBLE GRADIENT
    let gradient = ctx.createRadialGradient(
        b.x - size * 0.4,
        b.y - size * 0.4,
        0,
        b.x,
        b.y,
        size
    );

    gradient.addColorStop(0, `rgba(255,255,255,${b.alpha})`);
    gradient.addColorStop(0.3, `rgba(200,230,255,${b.alpha * 0.6})`);
    gradient.addColorStop(0.7, `rgba(180,220,255,${b.alpha * 0.2})`);
    gradient.addColorStop(1, `rgba(180,220,255,0)`);

    ctx.fillStyle = gradient;

    // 🔥 HIGH-END TOUCH (ELLIPSE = REAL BUBBLE SHAPE)
    ctx.beginPath();
    ctx.ellipse(
        b.x,
        b.y,
        size * 0.9,
        size * 1.1,
        0,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // ❌ Remove bubble if off screen
    if (b.y < -20) {
        bubbles.splice(i, 1);
    }
});

    ripples.forEach((r, i) => {

        r.r += 2;
        r.alpha *= 0.95;

        ctx.strokeStyle = `rgba(255,255,255,${r.alpha})`;

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();

        if (r.alpha < 0.01) ripples.splice(i, 1);
    });

    requestAnimationFrame(animate);
}

function generateHotspots() {

    if (!canvas || !canvas.width) {
        console.warn("Canvas not ready yet");
        return;
    }

    hotspots = [];

    for (let i = 0; i < Math.floor(canvas.width / 25); i++) {
        hotspots.push({
            x: canvas.width * Math.random(), 
            y: canvas.height * 0.7,
            radius: 80
        });
    }
}

// =====================================================
// 🌦 5. WEATHER ENGINE
// =====================================================

function fetchWeatherSafe() {
 
    const API_KEY = "63ba514dc7c2242cb10cd2632d2569ad";
 
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=-26.2&lon=28.0&units=metric&appid=${API_KEY}`)
        .then(r => r.json())
        .then(data => {
            console.log("Weather data received:", data);
 
            if (data && data.main) {
                renderDashboard(data);
            } else {
                console.warn("Invalid weather data", data);
            }
        })
        .catch(() => {
            console.warn("Using simulated weather");
 
            // ONLY fallback if no previous data
            if (!lastConditions || !lastConditions.main) {
                renderDashboard({
                    main: { temp: 22, pressure: 1018 },
                    wind: { speed: 3, deg: 180 },
                    clouds: { all: 40 }
                });
            }
        });
}
 
function updateFromWeather(data) {

  if (!ENV.air) {
    ENV.air = data.main.temp;
    SOURCE.air = "weather";
  }

  if (!ENV.pressure) {
    ENV.pressure = data.main.pressure;
    SOURCE.pressure = "weather";
  }

  if (!ENV.wind) {
    ENV.wind = data.wind.speed * 3.6;
    SOURCE.wind = "weather";
  }

  if (!ENV.cloud) {
    ENV.cloud = data.clouds.all;
    SOURCE.cloud = "weather";
  }
}

function calculateDerivedValues() {

  // Water temps fallback
  if (!ENV.surface || !ENV.bottom) {
    const surface = ENV.air - 1;
    const bottom = surface - 2.5;

    if (!ENV.surface) {
      ENV.surface = surface;
      SOURCE.surface = "model";
    }

    if (!ENV.bottom) {
      ENV.bottom = bottom;
      SOURCE.bottom = "model";
    }
  }

  // Oxygen calculation
  const temp = ENV.surface;
  const wind = ENV.wind || 0;
  const cloud = ENV.cloud || 50;

  let oxygen = 14.6 - (temp * 0.4);
  oxygen += wind * 0.1;
  oxygen += cloud * 0.02;

  ENV.oxygen = Math.max(5, Math.min(14, oxygen));
  SOURCE.oxygen = "calculated";

  // Light fallback
  if (!ENV.light) {
    const hour = new Date().getHours();

    if (hour >= 6 && hour <= 10) ENV.light = 60;
    else if (hour >= 17 && hour <= 20) ENV.light = 65;
    else if (hour >= 10 && hour <= 16) ENV.light = 85;
    else ENV.light = 20;

    SOURCE.light = "calculated";
  }
}

function analyzeWeather(w, p, c){

    let insights = [];
    let zone = getBestZone();

    if (zone === "shallow") {
    insights.push("Target shallow windward zones"); 
    }

    if (zone === "mid") {
    insights.push("Fish mid-depth transition areas"); 
    }

    if (zone === "deep") {
    insights.push("Focus on deeper structure"); 
    }
    if(w >= 5 && w <= 15){
        insights.push("Wind pushing food toward bank");
    }

    if(p > 1015){
        insights.push("Stable pressure supports feeding");
    }

    if(c >= 30 && c <= 70){
        insights.push("Cloud cover improves fish confidence");
    }
  
    return insights;
}

function calculateWaterTemps(airTemp) {

    // 🌞 Surface reacts fast (but not 1:1)
    let surface = airTemp - 1;

    // 🌊 Add realism: warm air doesn't fully transfer
    if (airTemp > 25) surface -= 1;
    if (airTemp < 15) surface += 0.5;

    // 🧊 Bottom is slower + more stable
    let bottom = surface - 2.5;

    // Stabilize bottom (never extreme swings)
    if (bottom < 8) bottom = 8 + (airTemp * 0.1);

    return {
        surface: parseFloat(surface.toFixed(1)),
        bottom: parseFloat(bottom.toFixed(1)),
        source: "forecast"
    };
}

// =====================================================
// 📊 WEAHTER ENGINE END
// =====================================================

// =====================================================
// 📊 SPI ENGINE
// =====================================================
function calculateSPI(envScore, waterScore, data) {

    let {
        p, w, c, windDir, t, light,
        depth, diff
    } = data;

    let reasons = [];
    let isCold = t <= 15;
    let trend = getPressureTrend(p);

    // =============================
    // 🧠 1. BASE = ENV + WATER FUSION
    // =============================

    let score;

    if (waterScore !== null) {

        // 🔥 TRUE FUSION (not just add-on)
        score = (envScore * 0.6) + (waterScore * 0.4);

        let delta = waterScore - envScore;

        // alignment boost
        if (envScore > 60 && waterScore > 60) {
            score += 5;
            reasons.push("Strong surface + water alignment");
        }

        // hidden opportunity
        if (envScore < 45 && waterScore > 60) {
            score += 8;
            reasons.push("Hidden water opportunity");
        }

        // conflict
        if (envScore > 60 && waterScore < 40) {
            score -= 8;
            reasons.push("Surface good, water weak");
        }

    } else {
        // fallback
        score = envScore;
    }

    // =============================
    // 🌬 2. WIND POSITIONING
    // =============================
    if (diff > 135) {
        score += 10;
        reasons.push("Wind pushing into zone");
    } else if (diff < 45) {
        score -= 6;
        reasons.push("Downwind zone");
    }

    // =============================
    // 🌊 3. DEPTH POSITIONING
    // =============================
    if (depth >= 2 && depth <= 5) {
        score += 8;
        reasons.push("Optimal feeding depth");
    } else if (depth < 1) {
        score -= 5;
    } else if (depth > 8) {
        score -= 4;
    }

    // =============================
    // 💡 4. LIGHT BEHAVIOUR
    // =============================
    if (light < 40) {
        score += 5;
        reasons.push("Low light feeding advantage");
    }

    if (light > 80 && c < 20) {
        score -= 6;
        reasons.push("Bright + clear pressure");
    }

    // =============================
    // ❄️ 5. WINTER ADAPTATION
    // =============================
    if (isCold) {

        if (trend === "stable") {
            score += 6;
            reasons.push("Stable winter pattern");
        }

        if (w >= 3 && w <= 10) {
            score += 4;
            reasons.push("Winter oxygen movement");
        }

        if (score >= 40 && score <= 60) {
            score += 4;
        }
    }

    // =============================
    // ⚡ 6. OPPORTUNITY BOOSTS
    // =============================
    if (w >= 5 && w <= 15 && c >= 30) {
        score += 6;
        reasons.push("Wind + cloud feeding setup");
    }

    if (p > 1015 && t >= 15) {
        score += 4;
        reasons.push("Stable atmospheric support");
    }

    // =============================
    // 🔴 7. REAL LIMITS ONLY
    // =============================
    if (w < 1) score -= 5;
    if (t < 8 || t > 32) score -= 5;

    // =============================
    // 🎯 8. FINAL SHAPING
    // =============================

    // soft curve (keeps mid-range realistic)
    score = Math.pow(score / 100, 1.1) * 100;

    score = Math.max(25, Math.min(90, score));

    // =============================
    // 🧠 REASON FILTER (your system)
    // =============================
    function filterInsights(reasons, SPI) {
        if (SPI < 45) {
            return reasons.map(r => {
                if (r.includes("feeding")) return "Limited feeding activity";
                if (r.includes("advantage")) return "Conditions slightly supportive";
                return r;
            });
        }
        return reasons;
    }

    reasons = filterInsights(reasons, score);

    return {
        score: Math.round(score),
        reasons
    };
}

// =====================================================
// 📊 CONF ENGINE START
// =====================================================

function calculateCONF(SPI, envScore, p, w, c, t) {

    let score = 50; // 🔥 BASELINE (important)

    let isCold = t <= 15;
    let trend = getPressureTrend(p);

    // =============================
    // 🟢 1. ALIGNMENT (±15)
    // =============================
    let alignment = Math.abs(SPI - envScore);

    if (alignment < 10) score += 12;
    else if (alignment < 20) score += 6;
    else score -= 6;

    // =============================
    // 🟢 2. STABILITY (±15)
    // =============================
    let variability = Math.abs(SPI - (lastSPI ?? SPI));

    if (variability < 5) score += 12;
    else if (variability < 10) score += 6;
    else score -= 8;

    // =============================
    // 🟢 3. PRESSURE RELIABILITY (±12)
    // =============================
    if (trend === "stable") score += 10;
    else if (trend === "rising") score += 6;
    else score -= 4;

    // =============================
    // 🟢 4. ENV SUPPORT (±12)
    // =============================
    if (envScore >= 60) score += 10;
    else if (envScore >= 45) score += 6;
    else score += 2; // 🔥 LOW ENV still gives confidence

    // =============================
    // 🟢 5. CONDITION CONSISTENCY (±10)
    // =============================
    let consistency = 0;

    if (w >= 3 && w <= 15) consistency += 4;
    if (c >= 20 && c <= 80) consistency += 3;
    if (t >= 10 && t <= 28) consistency += 3;

    score += consistency;

    // =============================
    // ❄️ 6. WINTER ADAPTATION (NEW)
    // =============================
    if (isCold) {

        // stable cold conditions = predictable
        if (trend === "stable") score += 8;

        // alignment matters more in winter
        if (alignment < 15) score += 6;

        // moderate SPI in winter is GOOD
        if (SPI >= 40 && SPI <= 60) score += 6;
    }

    // =============================
    // 🔴 7. ONLY REAL RISKS (reduced penalties)
    // =============================

    if (variability > 15) score -= 10; // unstable system

    if (w > 20 || w < 1) score -= 6;
    if (t > 32 || t < 8) score -= 6;
    if (c > 95 || c < 5) score -= 5;

    // =============================
    // 🎯 SOFT SCALING
    // =============================
    score = Math.pow(score / 100, 1.1) * 100;

    if (isNaN(score)) score = 50;

    return Math.max(35, Math.min(95, Math.round(score))); 
}

// =====================================================
// 📊 CONF ENGINE END
// =====================================================

// =====================================================
// 📊  SCOUT and TILE ENGINE START
// =====================================================

function calculateAverageSPI() {
    if (drops.length === 0) return 0;

    let total = drops.reduce((sum, d) => sum + d.spi, 0);
    return parseFloat((total / drops.length).toFixed(1));
}


// =====================================================
// 🎣 AIF TILE ENGINE (CARP OPTIMISED)
// =====================================================

// 🎯 MAIN UPDATE FUNCTION
function updateAllTiles(data) {
  
  applyTileColor("airTile", getAirStatus(data.air));
  applyTileColor("surfaceTile", getSurfaceStatus(data.surface));
  applyTileColor("bottomTile", getBottomStatus(data.bottom));
  applyTileColor("depthTile", getDepthStatus(data.surface, data.bottom));
  applyTileColor("pressureTile", getPressureStatus(data.pressure));
  applyTileColor("windTile", getWindStatus(data.wind));
  applyTileColor("cloudTile", getCloudStatus(data.cloud));
  applyTileColor("oxygenTile", getOxygenStatus(data.oxygen, data.surface));
  applyTileColor("lightTile", getLightStatus(data.cloud, data.time)); 
}

// =====================================================
// 🌬️ AIR TEMP
// =====================================================
function getAirStatus(temp) {
  if (temp >= 15 && temp <= 24) return "green";
  if (temp >= 10 && temp <= 28) return "green";
  if (temp >= 7 && temp <= 24) return "orange";
  return "red";
}


// =====================================================
// 🌊 SURFACE TEMP
// =====================================================
function getSurfaceStatus(temp) {
  if (temp >= 16 && temp <= 22) return "green";
  if (temp >= 12 && temp <= 26) return "orange";
  return "red";
}


// =====================================================
// ⬇️ BOTTOM TEMP
// =====================================================
function getBottomStatus(temp) {
  if (temp >= 14 && temp <= 20) return "green";
  if (temp >= 10 && temp <= 24) return "orange";
  return "red";
}


// =====================================================
// 🌡️ DEPTH / MIXING
// =====================================================
function getDepthStatus(surface, bottom) {
  const diff = Math.abs(surface - bottom);

  if (diff <= 2) return "green";
  if (diff <= 5) return "orange";
  return "red";
}


// =====================================================
// 🌬️ PRESSURE
// =====================================================
function getPressureStatus(p) {
  if (p >= 1012 && p <= 1022) return "green";
  if (p >= 1005 && p <= 1028) return "orange";
  return "red";
}


// =====================================================
// 💨 WIND
// =====================================================
function getWindStatus(wind) {
  if (wind >= 5 && wind <= 15) return "green";
  if (wind >= 2 && wind <= 20) return "orange";
  return "red";
}


// =====================================================
// ☁️ CLOUD
// =====================================================
function getCloudStatus(cloud) {
  if (cloud >= 30 && cloud <= 70) return "green";
  if (cloud >= 10 && cloud <= 90) return "orange";
  return "red";
}


// =====================================================
// 🫧 OXYGEN (VERY IMPORTANT)
// =====================================================
function getOxygenStatus(oxygen, temp) {

  // fallback if oxygen not available
  if (!oxygen) {
    // estimate based on temp
    if (temp >= 16 && temp <= 22) return "green";
    if (temp >= 12 && temp <= 26) return "orange";
    return "red";
  }

  if (oxygen >= 7) return "green";
  if (oxygen >= 5) return "orange";
  return "red";
}


// =====================================================
// ☀️ LIGHT (TIME + CLOUD COMBO)
// =====================================================
function getLightStatus(cloud, time) {

  // assume time = hour (0–23)
  if (time >= 6 && time <= 10) return "green";     // morning
  if (time >= 17 && time <= 20) return "green";    // evening

  if (cloud >= 40 && cloud <= 80) return "green";  // diffused light

  if (time >= 10 && time <= 16) return "orange";   // midday

  return "red"; // night / extreme
}


// =====================================================
// 🎨 APPLY COLOR ENGINE
// ===================================================== 
function applyTileColor(tileId, status) {

  const tile = document.getElementById(tileId);
  if (!tile) {
    console.warn("Missing Tile:", tileId);
    return;
}

 const icon = tile.querySelector("i");

    if (icon) {
    if (status === "red") {
        icon.style.color = "#ff3b3b";
        icon.style.opacity = 1;
    } else {
        icon.style.color = "#ffffff";
        icon.style.opacity = 0.6;
    }
}

  // reset
  tile.style.borderColor = "";
  tile.style.boxShadow = "";
  tile.style.background = "";

  if (status === "green") {
    tile.style.borderColor = "#00ff9c";
    tile.style.boxShadow = "0 0 15px rgba(0,255,156,0.45)";
    tile.style.background = "rgba(0,255,156,0.05)";
  }

  else if (status === "orange") {
    tile.style.borderColor = "#ffaa00";
    tile.style.boxShadow = "0 0 12px rgba(255,170,0,0.35)";
    tile.style.background = "rgba(255,170,0,0.05)";
  }

  else {
    tile.style.borderColor = "#ff3b3b";
    tile.style.boxShadow = "0 0 12px rgba(255,59,59,0.35)";
    tile.style.background = "rgba(255,59,59,0.05)";
  }
}

// =====================================================
// 📊  SCOUT and TILE ENGINE END
// =====================================================

// =====================================================
// 📊 7. DASHBOARD (RENDER ENGINE START)
// =====================================================

function renderDashboard(data) {

    console.log("📊 Rendering dashboard");

    // =====================================================
    // 🧠 1. INPUT (EXTRACT + NORMALISE)
    // =====================================================

    lastConditions = data;

    const t = data.main.temp;
    const p = data.main.pressure;
    const w = data.wind.speed * 3.6;
    const c = data.clouds.all;

    const light = data.light || 50;
    const depth = ENV.depth || data.depth || 5;

    windDir = data.wind?.deg || 0;
    
    const tacticalData = { light, depth, wind: w };

    showInsight(
        SPI,
        envScore,
        confScoreValue,
        ENV.light || 50,
        ENV.depth || 3
    );

    // ================= COMPASS DIFF =================
    diff = 0;

    if (compassHeading != null) {
        diff = Math.abs(windDir - compassHeading);
        if (diff > 180) diff = 360 - diff;
    }

    console.log("Wind vs heading:", diff);

    // =====================================================
    // 🌡️ 2. WATER MODEL
    // =====================================================

    let temps = calculateWaterTemps(t);

    if (tempModel.source === "sensor") {
        temps = tempModel;
    }

    const surfaceTemp = temps.surface;
    const bottomTemp = temps.bottom;

    // =====================================================
    // 🧭 3. WORLD / POSITION SYSTEMS
    // =====================================================

    updateCompass(windDir);
    setFishingZone(windDir);

    envScore = calculateENV(p, c, w, light, t);
    confScoreValue = calculateCONF(SPI, envScore, p, w, c, t);
    
    const envEl = document.getElementById("envScore");
    if (envEl) envEl.innerText = envScore + "%";


    const confEl = document.getElementById("confScore");
    if (confEl) confEl.innerText = confScoreValue + "%";
    
    // =====================================================
    // 📊 4. SPI CALCULATION
    // =====================================================

let waterScore = null; // until sensor used

const result = calculateSPI(
    envScore,
    waterScore,
    {
        p,
        w,
        c,
        windDir,
        t,
        light,
        depth,
        diff
    }
);



// =============================
// 📊 SPI CORE
// =============================
waterScore = null;

let finalSPI = result.score;

// =============================
// 🔄 SMOOTHING
// =============================
if (lastSPI !== null) {
    finalSPI = Math.round((finalSPI * 0.7) + (lastSPI * 0.3)); }

// =============================
// 🌍 ENV ALIGNMENT
// =============================
let delta = finalSPI - envScore;
finalSPI -= delta * 0.2;

// =============================
// 🎯 LIMITS
// =============================
if (envScore < 85) {
    let cap = envScore + 12;
    if (finalSPI > cap) {
        finalSPI -= (finalSPI - cap) * 0.6;
    }
}

// =============================
// 🎣 SCOUT IMPACT
// =============================
finalSPI += calculateScoutImpact(scoutData) * 0.5;

// =============================
// FINAL CLAMP
// =============================
finalSPI = Math.max(10, Math.min(98, Math.round(finalSPI)));

SPI = finalSPI;
lastSPI = finalSPI;


    // =====================================================
    // 📊 5. ENV + CONF (🔥 MUST BE HERE)
    // =====================================================


    // =====================================================
    // 🎨 6. COLORS (NOW SAFE)
    // =====================================================

    const spiColor = getScoreColor(SPI);
    const safeENV = isNaN(envScore) ? 50 : envScore;
    const envColor = getScoreColor(safeENV);
    const confColor = getScoreColor(confScoreValue);

    // =====================================================
    // 🎯 7. ELEMENTS
    // =====================================================

    const spiCircle = document.getElementById("spiCircle");
    const envCircle = document.getElementById("envCircle");
    const confCircle = document.getElementById("confCircle");

    // =====================================================
    // 🎨 8. APPLY COLORS
    // =====================================================

    const spiText = document.getElementById("spiValue");
    const envText = document.getElementById("envScore");
    const confText = document.getElementById("confScore");

    if (spiText) spiText.style.color = spiColor;
    if (envText) envText.style.color = envColor;
    if (confText) confText.style.color = confColor;

    if (envCircle) {
        envCircle.style.borderColor = envColor;
        envCircle.style.boxShadow = `0 0 10px ${envColor}`;
    }

    if (confCircle) {
        confCircle.style.borderColor = confColor;
        confCircle.style.boxShadow = `0 0 10px ${confColor}`;
    }

    if (spiCircle) {
        spiCircle.style.stroke = spiColor;
    }

    // =====================================================
    // 🧠 9. ANALYSIS
    // =====================================================

    const tempAnalysis = analyzeTemperature(t, surfaceTemp, bottomTemp);

    const combinedReasons = [
        ...(result.reasons || []),
        ...(tempAnalysis.insights || [])
    ];

    updateTacticalBar(
    SPI,
    envScore,
    confScoreValue,
    ENV,
    lastSPI,
    forecastData || []
);


    // =====================================================
    // 🎨 10. VISUAL ENGINE
    // =====================================================

    updateSPI(SPI);
    bubbleIntensity = SPI / 100;

    // =====================================================
    // 🫧 11. OXYGEN SYSTEM
    // =====================================================

    const oxygen = estimateOxygen(t, w, c);

    const oxygenEl = document.getElementById("oxygen");
    if (oxygenEl) {
        oxygenEl.innerText = oxygen.toFixed(1) + " mg/L";
    }

    setIcon("droplets", oxygen, [
        { min: 9, max: 20, color: GREEN },
        { min: 7, max: 8.9, color: ORANGE },
        { min: 0, max: 6.9, color: RED }
    ]);

    // =====================================================
    // 📦 12. TILE ENGINE
    // =====================================================

    updateAllTiles({
        air: t,
        surface: surfaceTemp,
        bottom: bottomTemp,
        pressure: p,
        wind: w,
        cloud: c,
        oxygen: oxygen,
        time: new Date().getHours()
    });

    // =====================================================
    // 📊 13. UI VALUES
    // =====================================================

    document.getElementById("air").innerText = t.toFixed(1) + "°C";
    document.getElementById("surface").innerText = surfaceTemp.toFixed(1) + "°C";
    document.getElementById("bottom").innerText = bottomTemp.toFixed(1) + "°C";
    document.getElementById("pressure").innerText = p + " hPa";
    document.getElementById("wind").innerText = w.toFixed(1) + " km/h";
    document.getElementById("cloud").innerText = c + "%";
    document.getElementById("feed").innerText = feeding(finalSPI);

    // =====================================================
    // 🎨 14. ICON COLORS
    // =====================================================

    setIcon("sun", t, [
        { min: 30, max: 100, color: RED },
        { min: 25, max: 29, color: ORANGE }
    ]);

    setIcon("waves", surfaceTemp, [
        { min: 30, max: 100, color: RED },
        { min: 22, max: 29, color: ORANGE }
    ]);

    setIcon("arrow-down", bottomTemp, [
        { min: 28, max: 100, color: RED },
        { min: 20, max: 27, color: ORANGE }
    ]);

    setIcon("gauge", p, [
        { min: 1022, max: 1100, color: ORANGE },
        { min: 0, max: 1005, color: RED }
    ]);

    setIcon("wind", w, [
        { min: 20, max: 100, color: RED },
        { min: 12, max: 19, color: ORANGE }
    ]);

    setIcon("cloud", c, [
        { min: 80, max: 100, color: RED },
        { min: 40, max: 79, color: ORANGE }
    ]);

    setIcon("fish", finalSPI, [
        { min: 70, max: 100, color: GREEN },
        { min: 50, max: 69, color: ORANGE },
        { min: 0, max: 49, color: RED }
    ]);

    // =====================================================
    // 🌙 15. EXTRA INFO
    // =====================================================

    document.getElementById("moon").innerText = getMoonPhase();
    document.getElementById("season").innerText = getSeason();

    // =====================================================
    // 🎨 16. TILE GLOW
    // =====================================================

    document.querySelectorAll(".tile").forEach(tile => {
        tile.style.boxShadow = SPI >= 80
            ? "0 0 12px rgba(0,255,156,0.25), inset 0 0 10px rgba(255,255,255,0.05)"
            : "0 6px 18px rgba(0,0,0,0.35), inset 0 0 10px rgba(255,255,255,0.05)";
    });
}

// =====================================================
// 📊 7. DASHBOARD (RENDER ENGINE END)
// =====================================================

// =====================================================
// 🧠 8. ENVIRONMENT ENGINE
// =====================================================

function updateFromSensor(data) {
    if (data.surfaceTemp) {
        ENV.surface = data.surfaceTemp;
        SOURCE.surface = "sensor";
    }
    if (data.bottomTemp) {
        ENV.bottom = data.bottomTemp;
        SOURCE.bottom = "sensor";
    }
    if (data.pressure) {
        ENV.pressure = data.pressure;
        SOURCE.pressure = "sensor";
    }
    if (data.light) {
        ENV.light = data.light;
        SOURCE.light = "sensor";
    }
    if (data.depth) {
        ENV.depth = data.depth;
        SOURCE.depth = "sensor";
    }
}

// ================= ENV SCORE ================= 
function calculateENV(p, c, w, light, airTemp) {

    let score = 50; // 🔥 BASELINE (THIS FIXES YOUR 30% ISSUE)

    // =============================
    // 🌡 PRESSURE (±10)
    // =============================
    let trend = getPressureTrend(p);

    if (p >= 1012 && p <= 1020) score += 8;
    else if (p >= 1008 && p <= 1024) score += 5;
    else score -= 5;

    if (trend === "rising") score += 3;
    if (trend === "falling") score -= 3;

    // =============================
    // 🌬 WIND (±10)
    // =============================
    if (w >= 5 && w <= 15) score += 8;
    else if (w >= 3) score += 5;
    else if (w < 2) score -= 4;
    else score += 2;

    // =============================
    // ☁ CLOUD (±8)
    // =============================
    if (c >= 30 && c <= 70) score += 6;
    else if (c > 70) score += 4;
    else score -= 3;

    // =============================
    // 💡 LIGHT (±8)
    // =============================
    if (light >= 40 && light <= 70) score += 6;
    else if (light < 30) score += 5;
    else if (light > 80) score -= 4;

    // =============================
    // 🌡 TEMP (±12) → ADAPTIVE
    // =============================
    if (airTemp >= 18 && airTemp <= 24) score += 10;
    else if (airTemp >= 15) score += 7;
    else if (airTemp >= 12) score += 4;
    else if (airTemp >= 10) score += 2;
    else score -= 4;

    // =============================
    // ⚡ SMART INTERACTIONS (±10)
    // =============================

    // Wind + cloud synergy
    if (w >= 5 && c >= 30) score += 5;

    // Low light advantage
    if (light < 50) score += 3;

    // Dead calm + clear (bad combo)
    if (w < 2 && c < 20) score -= 6;

    // =============================
    // ⏱ TIME FACTOR (±8)
    // =============================
    let h = new Date().getHours();

    if (h >= 5 && h <= 9) score += 6;
    else if (h >= 17 && h <= 20) score += 8;
    else if (h >= 11 && h <= 15) score -= 4;

    // =============================
    // 🎯 CLAMP (IMPORTANT)
    // =============================
    return Math.max(20, Math.min(85, Math.round(score))); 
}

function calculateWaterScore(surfaceTemp, bottomTemp, thermoclineStart, thermoclineEnd, turbidity, light) {

    let score = 0;

    // =============================
    // 🌡 WATER TEMP PROFILE (30)
    // =============================
    let delta = Math.abs(surfaceTemp - bottomTemp);

    if (surfaceTemp >= 18 && surfaceTemp <= 24) score += 15;
    else if (surfaceTemp >= 15) score += 12;
    else if (surfaceTemp >= 12) score += 9;
    else score += 6;

    // Stability / layering
    if (delta >= 2 && delta <= 5) score += 10;   // ideal thermocline
    else if (delta > 5) score += 6;
    else score += 4;

    // =============================
    // 🌊 THERMOCLINE POSITION (20)
    // =============================
    if (thermoclineStart !== null && thermoclineEnd !== null) {

        let mid = (thermoclineStart + thermoclineEnd) / 2;

        if (mid >= 2 && mid <= 5) score += 20;   // perfect feeding zone
        else if (mid <= 7) score += 15;
        else score += 10;
    }

    // =============================
    // 🌫 TURBIDITY (15)
    // =============================
    if (turbidity >= 30 && turbidity <= 60) score += 15;
    else if (turbidity < 30) score += 10;
    else score += 8;

    // =============================
    // 💡 LIGHT PENETRATION (10)
    // =============================
    if (light >= 30 && light <= 70) score += 10;
    else if (light < 30) score += 8;
    else score += 6;

    return Math.max(0, Math.min(100, Math.round(score))); 
}


function calculateFinalSPI(envScore, waterScore, hasSensor) {

    if (!hasSensor) {
        return envScore; // fallback clean
    }

    // 🔥 Weighted + adaptive
    let finalScore = (envScore * 0.6) + (waterScore * 0.4);

    // Boost when both agree
    if (envScore > 60 && waterScore > 60) {
        finalScore += 5;
    }

    // Conflict handling
    if (envScore > 60 && waterScore < 40) {
        finalScore -= 8; // looks good outside, bad below
    }

    if (envScore < 40 && waterScore > 60) {
        finalScore += 10; // 🔥 hidden opportunity
    }

    return Math.max(0, Math.min(100, Math.round(finalScore))); 
}


// =====================================================
// 🧠 8. ENVIRONMENT ENGINE END
// =====================================================

// =====================================================
// 📈 TRENDS & TIME
// =====================================================

function getTempTrend(t) {
    tempHistory.push(t);
    if (tempHistory.length > 6) tempHistory.shift();

    if (tempHistory.length < 2) return "stable";

    const diff = tempHistory[tempHistory.length - 1] - tempHistory[0];

    if (diff > 1) return "warming";
    if (diff < -1) return "cooling_fast";
    return "stable";
}

function getPressureTrend(p) {
    pressureHistory.push(p);

    if (pressureHistory.length > 6) pressureHistory.shift();
    if (pressureHistory.length < 2) return "stable";

    const diff = pressureHistory.at(-1) - pressureHistory[0];

    if (diff > 1) return "rising";
    if (diff < -1) return "falling";
    return "stable";
}

function sunriseWindow() {
    const h = new Date().getHours();
    if (h >= 5 && h <= 9) return 10;
    if (h >= 17 && h <= 20) return 12;
    return 0;
}

function seasonalWeight() {
    const m = new Date().getMonth() + 1;

    if (m <= 2 || m === 12) return 8;
    if (m <= 5) return 4;
    if (m <= 8) return -4;
    return 6;
}

function getSeason() {
    const m = new Date().getMonth() + 1;

    if (m <= 2 || m === 12) return "Summer";
    if (m <= 5) return "Autumn";
    if (m <= 8) return "Winter";
    return "Spring";
}

function getMoonPhase() {
    const d = new Date();
    const lp = 2551443;
    const now = d.getTime() / 1000;
    const new_moon = 592500;

    const phase = ((now - new_moon) % lp) / lp;

    if (phase < 0.25) return "Waxing";
    if (phase < 0.5) return "Full";
    if (phase < 0.75) return "Waning";
    return "New";
}

// =====================================================
// 📈 TRENDS & TIME END
// =====================================================

function analyzeTemperature(air, surface, bottom) {

    let score = 0;
    let insights = []; // ✅ MUST be an array

    // Surface temp logic
    if (surface >= 18 && surface <= 24) {
        score += 8;
        insights.push("Surface temp optimal (18–24°C)");
    } else if (surface > 24) {
        score -= 4;
        insights.push("Surface temp too warm — fish may go deeper");
    } else {
        score -= 6;
        insights.push("Surface temp too cold — reduced activity");
    }

    // Thermal layering
    if (bottom < surface - 3) {
        score -= 4;
        insights.push("Thermal drop detected — fish holding deeper");
    } else {
        score += 2;
        insights.push("Stable water column — good feeding movement");
    }

    return {
        score: score,
        insights: insights // ✅ THIS is what fixes your error
    };
}

// =====================================================
// 🎯 STRATEGY ENGINE
// =====================================================

function getCastingAdvice(diff) {
    if (diff < 45) return "Into wind ⚠️";
    if (diff > 135) return "Perfect windward 🔥";
    return "Crosswind ⚠️";
}

function getDepthStrategy(light, depth) {
    if (light < 30) return "Fish shallow margins";
    if (light > 70) return "Fish deeper structure";
    if (depth >= 2 && depth <= 5) return "Target patrol routes";
    return "Adjust depth";
}

function getBaitSuggestion(SPI) {
    if (SPI > 75) return "High attract bait";
    if (SPI > 60) return "Balanced boilie approach";
    return "Single hookbait";
}

// =====================================================
// 🎯 STRATEGY ENGINE END
// =====================================================

// =====================================================
// 🧭 9. GPS + COMPASS + MAP
// =====================================================

let watchId;

function initGPS() {
    if (!navigator.geolocation) return;

    watchId = navigator.geolocation.watchPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;

            userLocation = { lat, lon };
            console.log("GPS Fix:", lat, lon);
            // 🔥 update map automatically
            if (mapInstance) {
                updateMapLocation(lat, lon);
            }
        },
        (err) => {
            console.warn("GPS error:", err);
        },
        {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 10000
        }
    );
}

// =====================================================
// 🧭 9. GPS + COMPASS + MAP END
// =====================================================


// ============================
// 🗺️ OPEN MAP (CLEAN VERSION)
// ============================
let followUser = true;
let interactionTimeout;

function openMap() {

    const mapScreen = document.getElementById("mapScreen");
    if (!mapScreen) return;

    mapScreen.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    setTimeout(() => {

        // =============================
        // 📍 GET LOCATION (SAFE)
        // =============================
        let lat = userLocation?.lat;
        let lon = userLocation?.lon;

        if (!lat || !lon) {
            console.warn("GPS not ready — using fallback");
            lat = -26.2;
            lon = 28.0;
        }

        // =============================
        // 🗺️ CREATE MAP (ONLY ONCE)
        // =============================
        if (!mapInstance) {

            mapInstance = L.map('mapContainer', {
                zoomControl: true
            }).setView([lat, lon], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '',
                maxZoom: 19
            }).addTo(mapInstance);

            // =============================
            // 🎯 HANDLE USER INTERACTION (ONLY ONCE)
            // =============================
            mapInstance.on("dragstart zoomstart", () => {
                followUser = false;
            });

            mapInstance.on("moveend zoomend", () => {
                clearTimeout(interactionTimeout);
                interactionTimeout = setTimeout(() => {
                    followUser = true;
                }, 5000);
            });

            console.log("✅ Map initialized");

        } else {

            // =============================
            // 🔄 UPDATE VIEW (SMART FOLLOW)
            // =============================
            if (followUser) {
                mapInstance.panTo([lat, lon]);
            }
        }

        // =============================
        // 📍 UPDATE USER MARKER
        // =============================
        updateMapLocation(lat, lon);

        // =============================
        // 🔥 CLEAR OLD DROP MARKERS
        // =============================
        window.dropMarkers.forEach(m => mapInstance.removeLayer(m));
        dropMarkers = [];

        // =============================
        // 🎯 DRAW DROPS
        // =============================
        drops.forEach(d => {
            if (!d.lat || !d.lon) return;

            const marker = L.marker([d.lat, d.lon], { icon: dropIcon })
                .addTo(mapInstance)
                .bindPopup(`SPI: ${d.spi}%`);

            window.dropMarkers.push(marker);
        });

        drawDropZone();
        drawScoutZone();

        // =============================
        // 🎯 SCOUT MARKERS
        // =============================
        console.log("SCOUTS:", scouts);

        if (window.scoutMarkers) {
            window.scoutMarkers.forEach(m => mapInstance.removeLayer(m));
        }
        window.scoutMarkers = [];

        scouts.forEach(s => {

            if (!s.lat || !s.lon) return;

            const popup = `
            <b>🎯 Scout #${s.id}</b><br>

            <b style="color:${
                s.spi >= 70 ? "green" :
                s.spi >= 50 ? "orange" :
                "red"
            }">
            Score: ${s.spi ?? "-"}
            </b><br><br>

            🌡 Bottom Temp: ${s.bottom ?? "-"}°C<br>
            🌊 Thermocline: ${
                s.thermoStart && s.thermoEnd
                    ? `${s.thermoStart}-${s.thermoEnd}m`
                    : "-"
            }<br>
            📊 Pressure: ${s.pressure ?? "-"} hPa<br><br>
            📊 Light: ${s.light ?? "-"} <br>
            📊 Depth: ${s.depth ?? "-"} m<br>
            📊 Altitude: ${s.altitude ?? "-"} m<br><br>

            🐟 Activity: ${s.activity ?? "-"}<br>
            💧 Water: ${s.clarity ?? "-"}<br>
            🏗 Structure: ${s.structure ?? "-"}<br>
            🌬 Wind: ${s.wind ?? "-"}<br>
            🐦 Birds: ${s.birds ?? "-"}<br><br>

            📍 GPS: ${s.lat.toFixed(5)}, ${s.lon.toFixed(5)}
            `;

           const offsetLat = s.lat + ((s.id || 1) * 0.00003); 
           const offsetLon = s.lon + ((s.id || 1) * 0.00003);

           const marker = L.marker([offsetLat, offsetLon], {
        icon: scoutIcon
})

                .addTo(mapInstance)
                .bindPopup(popup);

            window.scoutMarkers.push(marker);
        });

    }, 200);
}

        // =============================
        // 🧱 FIX RENDER SIZE (CRITICAL)
        // =============================
        setTimeout(() => {
            if (mapInstance) {
                mapInstance.invalidateSize();
        }

    }, 200);

let bestZoneCircle = null;

function drawDropZone() {
    const zone = getBestZone();
    if (!zone || !mapInstance) return;

    if (window.dropZoneCircle) {
        mapInstance.removeLayer(window.dropZoneCircle);
    }

    window.dropZoneCircle = L.circle([zone.lat, zone.lon], {
        radius: zone.strength === "strong" ? 80 : 50,
        color: "#28a745",
        fillColor: "#28a745",
        fillOpacity: 0.2
    }).addTo(mapInstance);
}


// ============================
// ❌ CLOSE MAP
// ============================
function closeMap() {
    const screen = document.getElementById("mapScreen");
    if (screen) screen.classList.add("hidden");
    document.body.style.overflow = "auto"; }


// ============================
// 📌 UPDATE USER LOCATION (CLEAN)
// ============================
function updateMapLocation(lat, lon) {

    // 🔒 STOP if map not ready
    if (!mapInstance) {
        console.warn("⛔ Map not ready — skip update");
        return;
    }

    // 🔒 STOP if invalid coords
    if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) {
        console.warn("⛔ Invalid GPS — skip update");
        return;
    }

    // =============================
    // 📍 UPDATE MAP VIEW (SMOOTH)
    // =============================
    // Only recenter if far away (prevents jitter later)
    const currentCenter = mapInstance.getCenter();

    const distance = mapInstance.distance(
        [currentCenter.lat, currentCenter.lng],
        [lat, lon]
    );

    if (distance > 50 && followUser) { 
        mapInstance.panTo([lat, lon], {
            animate: true
    });
    }

    // =============================
    // 🧍 USER MARKER
    // =============================
    if (!userMarker) {

        userMarker = L.marker([lat, lon], {
            icon: userIcon // ✅ your global icon
        })
        .addTo(mapInstance)
        .bindPopup("You 🎯");

    } else {

        userMarker.setLatLng([lat, lon]);

    }
}


// =====================================================
// 🎯 10. UI HELPERS START
// =====================================================

function updateSPI(v){

    if (v == null || isNaN(v)) return;
    
    let arc = document.getElementById("spiArc");
    if(!arc) return;

    let color = GREEN;

    if (v < 50) color = GREEN;
    else if (v < 70) color = GREEN;

    arc.style.stroke = color;

    let r = arc.r.baseVal.value;
    let C = 2 * Math.PI * r;

    arc.style.strokeDasharray = C;
    arc.style.strokeDashoffset = C - (v / 100) * C;

    document.getElementById("spiValue").textContent = Math.round(v) + "%";

    // 🔥 ADD YOUR GLOW HERE
    let gauge = document.getElementById("spiGauge");

    if(gauge){
        gauge.style.filter = v >= 70
            ? "drop-shadow(0 0 12px rgba(0,255,156,0.35))"
            : "drop-shadow(0 0 6px rgba(0,255,156,0.15))";
    }

let envCircle = document.querySelector(".env-circle");
let confCircle = document.querySelector(".conf-circle");

if (envCircle && confCircle) {
    if (v >= 70) {
        envCircle.style.boxShadow = "0 0 10px rgba(0,255,156,0.4)";
        confCircle.style.boxShadow = "0 0 10px rgba(0,255,156,0.4)";
    } else {
        envCircle.style.boxShadow = "none";
        confCircle.style.boxShadow = "none";
    }
}
}

function estimateOxygen(temp, wind, cloud) {

    // Base oxygen decreases with temperature
    let base = 14.6 - (temp * 0.4);

    // Wind increases oxygen
    let windEffect = wind * 0.1;

    // Clouds slightly increase oxygen (less sunlight = less algae consumption swings)
    let cloudEffect = cloud * 0.02;

    let oxygen = base + windEffect + cloudEffect;

    return Math.max(5, Math.min(14, oxygen)); 
}

function refreshDashboard(){
    console.log("Manual refresh triggered");

    let icon = document.getElementById("refreshIcon");

    if(icon){
        icon.style.animation = "spin 1s linear infinite";
    }

    fetchWeatherSafe();

    // stop after 1.5s (or when fetch returns later)
    setTimeout(() => {
        if(icon){
            icon.style.animation = "none";
        }
    }, 1500);
}

function toggleAI() {
    const panel = document.getElementById("aiPanel");
    const toggle = document.getElementById("aiToggle");

    if (!panel || !toggle) return;

    panel.classList.toggle("active");

    if (panel.classList.contains("active")) {
        toggle.innerText = "−";

        if (typeof showInsight === "function") {
            showInsight(
                SPI,
                envScore,          // ✅ REAL VALUE
                confScoreValue,   // ✅ REAL VALUE
                ENV.light || 50,
                ENV.depth || 3
            );
        }

    } else {
        toggle.innerText = "+";
    }
}


// =====================================================
// 🎯 SCOUT MODE (SENSOR TRIGGER)
// =====================================================

function setScout(type, value) {
    scoutData[type] = value;
    console.log("Scout:", scoutData);
}

function openScout() {
    const screen = document.getElementById("scoutScreen");
    screen.classList.remove("hidden");

    // 🔥 Important: delay until DOM is visible
    setTimeout(() => {
        setupScoutOptions();
    }, 50);
}

function setupScoutOptions(){

    const buttons = document.querySelectorAll(".opt");

    buttons.forEach(btn => {

        btn.onclick = function(){

            const type = this.dataset.type;
            let value = this.dataset.value;

            // ✅ NORMALIZE VALUES
            if (value === "slightly-stained") value = "stained";

            // remove active from same group
            document.querySelectorAll(`.opt[data-type="${type}"]`)
                .forEach(el => el.classList.remove("active"));

            this.classList.add("active");

            scoutData[type] = value;

            console.log("Scout updated:", scoutData);
        };
    });
}

async function continueScout() {

    // ============================
    // 📍 GPS (SAFE + FALLBACK)
    // ============================
    const lat = userLocation?.lat ?? window.lastLat;
    const lon = userLocation?.lon ?? window.lastLon;

    if (lat == null || lon == null) {
        alert("⚠️ No GPS yet - move slightly and try again");
        return;
    }

    window.lastLat = lat;
    window.lastLon = lon;

    console.log("📍 GPS Fix:", lat, lon);

    function clearScoutMarkers() {
        scoutMarkers.forEach(marker => marker.remove());
        scoutMarkers = [];
    }

    // ============================
    // 📥 COLLECT INPUT DATA (FIXED)
    // ============================
    const newScout = {
        lat,
        lon,
        id: scouts.length + 1,
        time: Date.now(),

        spi: SPI,

        // 🌡 TEMPS
        bottom: parseFloat(document.getElementById("bottomTemp")?.value) || null,
        surfaceTemp: parseFloat(document.getElementById("surfaceTemp")?.value) || null,

        // 🌊 THERMOCLINE
        thermoStart: parseFloat(document.getElementById("thermoStart")?.value) || null,
        thermoEnd: parseFloat(document.getElementById("thermoEnd")?.value) || null,

        // 📊 WEATHER / SENSOR
        airTemp: parseFloat(document.getElementById("airTemp")?.value) || null,
        pressure: parseFloat(document.getElementById("pressure")?.value) || null,
        altitude: parseFloat(document.getElementById("altitude")?.value) || null,

        turbidity: parseFloat(document.getElementById("turbidity")?.value) || null,
        light: parseFloat(document.getElementById("light")?.value) || null,
        depth: parseFloat(document.getElementById("depth")?.value) || null,

        // 🎯 OBSERVATIONS
        activity: document.querySelector('.opt.active[data-type="activity"]')?.dataset.value ?? null,
        clarity: document.querySelector('.opt.active[data-type="clarity"]')?.dataset.value ?? null,
        birds: document.querySelector('.opt.active[data-type="birds"]')?.dataset.value ?? null,
        structure: document.querySelector('.opt.active[data-type="structure"]')?.dataset.value ?? null,
        wind: document.querySelector('.opt.active[data-type="wind"]')?.dataset.value ?? null
    };

    // ============================
    // 🔄 FIX THERMO VALUES
    // ============================
    if (newScout.thermoStart != null && newScout.thermoEnd != null) {
        if (newScout.thermoStart > newScout.thermoEnd) {
            [newScout.thermoStart, newScout.thermoEnd] =
            [newScout.thermoEnd, newScout.thermoStart];
        }
    }

    // ============================
    // ✅ MIN VALIDATION
    // ============================
    const filledFields = Object.values(newScout)
        .filter(v => v !== null && v !== undefined).length;

    if (filledFields < 2) {
        alert("⚠️ Add a few more observations");
        return;
    }

    // ============================
    // 💾 SAVE
    // ============================
    scouts.push(newScout);

    localStorage.setItem("scouts", JSON.stringify(scouts));
    localStorage.setItem("scoutLatest", JSON.stringify(newScout));

    console.log("Saved Scouts:", scouts);
    console.log("✅ Scout saved:", newScout);

    if (newScout.light != null) {
        ENV.light = newScout.light;
    }
    
    if (newScout.depth != null) {
    ENV.depth = newScout.depth;
    }

    if (newScout.altitude != null) {
    ENV.altitude = newScout.altitude;
    }
    
    closeScout();

    // ============================
    // 🗺️ REFRESH MAP
    // ============================
    if (mapInstance) {
        drawScoutZone();
    }

    alert("✅ Scout saved successfully"); 
}

function showConnectingScreen() {

    let screen = document.getElementById("scoutScreen");

    screen.innerHTML = `
    <div class="scout-card">
        <div class="scout-title">Connecting to AIF Sensor</div>

        <div class="sensor-list" id="sensorStatusList">
            Checking sensors...
        </div>

        <div class="scout-actions">
            <button onclick="retryConnection()" class="btn secondary">Retry</button>
            <button onclick="startScan()" class="btn primary">Start Scan</button>
        </div>
    </div>
    `;

    checkSensors();
}

function updateScoutUI() {

    const inputs = document.getElementById("sensorFields");
    const btn = document.getElementById("scoutBtn");

    if (!inputs || !btn) return;

    if (dataSource === "manual") {
        inputs.style.display = "block";
        btn.innerText = "Save";
    } else {
        inputs.style.display = "none";
        btn.innerText = "Scan Sensor";
    }
}


async function handleScout() {

  if (dataSource === "sensor") {
    await connectSensor();
  } else {
    continueScout();
  }

}

function simulateSensorFill() {
    return {
        airTemp: 18,
        pressure: 1015,
        surfaceTemp: 17,
        bottomTemp: 14,
        turbidity: 45,
        light: 60,
        depth: 3
    };
}


function fillScoutFields(data) {

    document.getElementById("airTemp").value = data.airTemp || "";
    document.getElementById("pressure").value = data.pressure || "";
    document.getElementById("surfaceTemp").value = data.surfaceTemp || "";
    document.getElementById("bottomTemp").value = data.bottomTemp || "";
    document.getElementById("turbidity").value = data.turbidity || "";
    document.getElementById("light").value = data.light || "";
    document.getElementById("depth").value = data.depth || "";

}


function checkSensors() {
  let list = document.getElementById("sensorStatusList");

  if (list) list.innerHTML = "Connecting...";

  return fetch("http://192.168.1.160/data")
    .then(res => res.json())
    .then(data => {

      document.getElementById("sensorStatusList").innerHTML = `
        <div>Temperature ${data.temp !== undefined ? "✅" : "❌"}</div>
        <div>Pressure ${data.pressure !== undefined ? "✅" : "❌"}</div>
        <div>Altitude ${data.altitude !== undefined ? "✅" : "❌"}</div>
        <div>Light ${data.light !== undefined ? "✅" : "❌"}</div>
        <div>Turbidity ${data.turbidity !== undefined ? "✅" : "❌"}</div>
        <div>Depth ${data.depth !== undefined ? "✅" : "❌"}</div>
      `;

      return true; // 👈 success
    })
    .catch(err => {
      console.error("FETCH ERROR:", err);

      document.getElementById("sensorStatusList").innerHTML =
        "❌ Connection failed";

      return false; // 👈 fail
    });
}

function retryConnection() {

    retryCount++;

    if (retryCount > 5) {
        document.getElementById("sensorStatusList").innerHTML =
            "❌ Unable to connect. Check AIF WiFi.";
        return;
    }

    document.getElementById("sensorStatusList").innerHTML =
        `Reconnecting... (${retryCount}/5)`;

    setTimeout(checkSensors, 1000);
}

function updateDashboardFromScout(data) {

  if (data.air)
    document.getElementById("air").innerText = data.air + "°C";

  if (data.surface)
    document.getElementById("surface").innerText = data.surface + "°C";

  if (data.bottom)
    document.getElementById("bottom").innerText = data.bottom + "°C";

  if (data.pressure)
    document.getElementById("pressure").innerText = data.pressure + " hPa";

  if (data.light)
    document.getElementById("light").innerText = data.light + "%";

  if (data.depth)
    document.getElementById("depth").innerText = data.depth + " m";

  console.log("Dashboard updated from Scout ✅"); 
}


let bleCharacteristic;

function handleSensorData(event) {
  const value = event.target.value;

  // decode bytes → string
  const decoder = new TextDecoder('utf-8');
  const jsonString = decoder.decode(value);

  console.log("RAW:", jsonString);

  try {
    const data = JSON.parse(jsonString);

    console.log("Parsed:", data);

    populateSensorData(data);

  } catch (e) {
    console.error("JSON parse error:", e);
  }
}

function startScan() {

    let screen = document.getElementById("scoutScreen");

    screen.innerHTML = `
    <div class="scout-card">
        <div class="scout-title">Scanning...</div>
        <div class="scan-loader"></div>
        <div class="scan-text">
            Reading sensors<br>
            Calculating SPI<br>
            Analyzing conditions...
        </div>
    </div>
    `;

    setTimeout(() => {

        fetch("http://192.168.1.160/data")
            .then(res => res.json())
            .then(data => {
            if (data.surfaceTemp && data.bottomTemp) {
                tempModel = {
                surface: data.surfaceTemp,
                bottom: data.bottomTemp,
                source: "sensor"
        };
    }

                renderDashboard(data);
                showResults(data);
            })
            .catch(() => {
                showScanFailed();
            });

    }, 2000);
}

let scoutMode = "manual";

function updateScoutMode(mode) {

  scoutMode = mode;

  const sensorBox = document.getElementById("sensorBox");
  const manualBtn = document.getElementById("manualBtn");
  const sensorBtn = document.getElementById("sensorBtn");

  if (mode === "sensor") {
    sensorBox.style.display = "block";
    manualBtn.classList.remove("active");
    sensorBtn.classList.add("active");
  } else {
    sensorBox.style.display = "none";
    manualBtn.classList.add("active");
    sensorBtn.classList.remove("active");
  }
}

let dataSource = "manual"; // default

function selectSource(type) {
  dataSource = type;

  document.querySelectorAll('.source-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  document.querySelector(`[data-source="${type}"]`)
    .classList.add('active');

  // SHOW / HIDE SENSOR UI
  document.getElementById("sensorBox").style.display =
    type === "sensor" ? "block" : "none"; 
}


async function connectSensor() {

  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['12345678-1234-1234-1234-1234567890ab'] // your ESP32 service
    });

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService('12345678-1234-1234-1234-1234567890ab');
    const characteristic = await service.getCharacteristic('abcd1234-ab12-cd34-ef56-abcdef123456');

    await characteristic.startNotifications();

    characteristic.addEventListener('characteristicvaluechanged', (event) => {

      const value = event.target.value;

      // 👉 THIS IS YOUR CODE (CORRECT PLACE)
      const decoder = new TextDecoder('utf-8');
      const jsonString = decoder.decode(value);

      try {
        const data = JSON.parse(jsonString);
        console.log("Sensor data:", data);

        populateSensorData(data); // ← your function

      } catch (e) {
        console.error("JSON parse error:", e, jsonString);
      }

    });

    document.getElementById("sensorStatus").innerText = "Connected ✅";

  } catch (error) {
    console.error("Bluetooth error:", error);
  }
}

function applySensorData(data) {

  document.getElementById("airTemp").value = data.temp ?? "";
  document.getElementById("pressure").value = data.pressure ?? "";
  document.getElementById("surfaceTemp").value = data.surfaceTemp ?? "";
  document.getElementById("bottomTemp").value = data.bottomTemp ?? "";
  document.getElementById("depth").value = data.depth ?? "";

}

function showScanFailed() {

    let screen = document.getElementById("scoutScreen");

    screen.innerHTML = `
    <div class="scout-card">
        <div class="scout-title">Scan Failed</div>

        <div class="error-text">
            ESP device not reachable
        </div>

        <div class="scout-actions">
            <button onclick="retryConnection()" class="btn secondary">Retry</button>
            <button onclick="closeScout()" class="btn primary">Exit</button>
        </div>
    </div>
    `;
}

function populateSensorData(data) {

  document.getElementById("airTemp").value = data.air || "";
  document.getElementById("pressure").value = data.pressure || "";
  document.getElementById("altitude").value = data.altitude || "";

  document.getElementById("surfaceTemp").value = data.surface || "";
  document.getElementById("bottomTemp").value = data.bottom || "";

  document.getElementById("turbidity").value = data.turbidity || "";

  alert("Sensor data loaded ✅");

}

function saveAndScan() {
    localStorage.setItem("scoutData", JSON.stringify(scoutData));
    showConnectingScreen();
}

function resetTempModel(){
    tempModel = {
        surface: null,
        bottom: null,
        source: "forecast"
    };
}


function loadDrops() {
    try {
        const stored = localStorage.getItem("drops");

        if (!stored) {
            drops = [];
            return;
        }

        const parsed = JSON.parse(stored);

        // 🔥 HARD VALIDATION
        if (!Array.isArray(parsed) || parsed.length === 0) {
            drops = [];
            localStorage.removeItem("drops"); // clean bad state
            return;
        }

        drops = parsed;

    } catch (e) {
        console.warn("⚠️ Corrupt drop storage, resetting...");
        drops = [];
        localStorage.removeItem("drops");
    }
}

console.log("DROPS AFTER LOAD:", drops);

function showSummary() {

    let last = drops[drops.length - 1];

    let screen = document.getElementById("scoutScreen");

    screen.innerHTML = `
        <div class="scout-title">Scout Summary</div>

        <div>📍 Lat: ${last.lat?.toFixed(5)}</div>
        <div>📍 Lon: ${last.lon?.toFixed(5)}</div>

        <div>📊 SPI: ${last.spi}%</div>
        <div>🌍 ENV: ${last.env}%</div>
        <div>🧠 CONF: ${last.conf}%</div>

        <div>🌡 Surface: ${last.surface || "-"}°C</div>
        <div>🌊 Bottom: ${last.bottom || "-"}°C</div>
        <div>📏 Depth: ${last.depth || "-"} m</div>

        <div class="scout-btn" onclick="closeScout()">Done</div>
    `;
}

function showResults(data) {

    let screen = document.getElementById("scoutScreen");

    let scout = JSON.parse(localStorage.getItem("scoutData")) || {};

    screen.innerHTML = `
        <div class="scout-title">Scan Complete</div>

        <div>SPI: ${SPI}%</div>

        <div style="margin-top:15px;">
            <b>Scout Inputs:</b><br>
            Activity: ${scout.activity || "-"}<br>
            Clarity: ${scout.clarity || "-"}<br>
            Wind: ${scout.wind || "-"}
        </div>

        <div style="margin-top:15px;">
            <b>Sensor Data:</b><br>
            Temp: ${data.main?.temp || "-"}°C<br>
            Oxygen: ${data.oxygen || "-"}
        </div>

        <div class="scout-btn" onclick="closeScout()">Done</div>
    `;
}

function calculateScoutImpact(scout){

    let score = 0;

    // 🐟 Activity
    if(scout.activity === "none") score -= 15;
    if(scout.activity === "bubbles") score += 5;
    if(scout.activity === "rolling") score += 15;

    // 🌊 Clarity
    if(scout.clarity === "clear") score += 5;
    if(scout.clarity === "stained") score += 10;
    if(scout.clarity === "murky") score -= 5;

    // 🐦 Birds
    if(scout.birds === "some") score += 5;
    if(scout.birds === "active") score += 10;

    // 🌬 Wind effect
    if(scout.wind === "bank") score += 10;
    if(scout.wind === "calm") score -= 5;

    // 🌊 Surface activity
    if(scout.surface === "medium") score += 5;
    if(scout.surface === "high") score += 10;

    // 🪵 Structure
    if(scout.structure === "weed") score += 5;
    if(scout.structure === "dropoff") score += 10;

    return Math.max(-20, Math.min(20, score)); 
}

function closeScout(){
    
    document.body.style.overflow = "auto";
    let screen = document.getElementById("scoutScreen");

    screen.classList.add("hidden");

    screen.innerHTML = originalScoutHTML; 
}

function feeding(spi) {

    if (spi >= 80) return "High Activity 🔥";
    if (spi >= 60) return "Active 👍";
    if (spi >= 40) return "Slow 😐";
    return "Low Activity ❄️";
}

// 🌊 HOLD AND COACH
function setupHold(elementId, callback) {

    let timer;
    const el = document.getElementById(elementId);

    if (!el) {
        console.log("❌ Element NOT FOUND:", elementId);
        return;
    }

    console.log("✅ HOLD ATTACHED:", elementId);

    el.addEventListener("touchstart", () => {
        timer = setTimeout(callback, 600);
    });

    el.addEventListener("touchend", () => {
        clearTimeout(timer);
    });
}


// 🌊 DROP

function openDrop() {

    if (!userLocation.lat || !userLocation.lon) {
        alert("GPS not ready yet — wait a few seconds");
        return;
    }

    const drop = {
        id: Date.now(),
        time: new Date().toISOString(),
        lat: userLocation.lat,
        lon: userLocation.lon,
        spi: SPI,
        env: envScore,
        conf: confScoreValue,
        surface: ENV.surface,
        bottom: ENV.bottom,
        depth: ENV.depth,
        oxygen: ENV.oxygen,
        scout: { ...scoutData }
    };

    drops.push(drop);
    localStorage.setItem("drops", JSON.stringify(drops));

    console.log("DROP SAVED:", drop);

    showDropFeedback();
    ripple();
}

function showDropFeedback() {

    let toast = document.createElement("div");
    toast.innerText = `🎯 Drop logged • SPI ${SPI.toFixed(1)}%`;

    toast.style.position = "fixed";
    toast.style.bottom = "120px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.background = "rgba(0,0,0,0.8)";
    toast.style.color = "#00ffa6";
    toast.style.padding = "12px 18px";
    toast.style.borderRadius = "12px";
    toast.style.fontSize = "14px";
    toast.style.zIndex = "9999";
    toast.style.boxShadow = "0 0 10px rgba(0,255,156,0.3)";

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 1500);
}

// 🌊 REPORT

function openReport() {

    const screen = document.getElementById("reportScreen");
    screen.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    buildReport();
}

function closeReport() {
    document.getElementById("reportScreen").classList.add("hidden");
    document.body.style.overflow = "auto"; 
}

function buildReport() {

    document.getElementById("repDrops").innerText = drops.length;

    // Best SPI
    let best = drops.length ? Math.max(...drops.map(d => d.spi)) : 0;
    document.getElementById("repBest").innerText = best.toFixed(1) + "%";

    // Average SPI
    let avg = drops.length
        ? drops.reduce((s, d) => s + d.spi, 0) / drops.length
        : 0;

    document.getElementById("repAvg").innerText = avg.toFixed(1) + "%";

    // Scout points
    document.getElementById("repScout").innerText =
        Object.keys(scoutData || {}).length;

    // Build Drop Log
    buildDropLog();

    // Build Map
    buildReportMap();
}

function buildDropLog() {

    let container = document.getElementById("dropLog");
    container.innerHTML = "";

    drops.forEach((d, i) => {

        let time = new Date(d.time).toLocaleString();

        let el = document.createElement("div");
        el.className = "drop-card";

       el.innerHTML = `
<div class="drop-card">
  <div class="drop-title">🎯 Drop ${i+1}</div>
  <div>🕒 ${time}</div>
  <div>📊 SPI: ${d.spi}%</div>
  <div>📍 ${d.lat ? d.lat.toFixed(4) : "-"}, ${d.lon ? d.lon.toFixed(4) : "-"}</div> </div> `;

        container.appendChild(el);
    });
}

let reportMapInstance;

function buildReportMap() {

    setTimeout(() => {

        if (!reportMapInstance) {

            reportMapInstance = L.map('reportMap').setView([-26.2, 28.0], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
                .addTo(reportMapInstance);
        }

        // clear old markers
        reportMapInstance.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                reportMapInstance.removeLayer(layer);
            }
        });
    
drops.forEach(d => {
    if (!d.lat || !d.lon) return;

    const marker = L.marker([d.lat, d.lon])
        .addTo(reportMapInstance)
        .bindPopup(`SPI: ${d.spi.toFixed(1)}%`);

    scoutMarkers.push(marker);
});

        setTimeout(() => {
            reportMapInstance.invalidateSize();
        }, 200);

    }, 300);
}

// =====================================================
// 🎯 BEST FISHING ZONE (DROPS BASED)
// =====================================================
function scoreScout(s) {
    let score = 0;

    if (s.activity === "rolling") score += 40;
    if (s.activity === "active") score += 30;

    if (s.clarity === "clean") score += 20;
    if (s.clarity === "stained") score += 10;

    if (s.birds === "present") score += 15;

    if (s.structure === "dropoff") score += 20;

    if (s.wind === "calm") score += 10;

    return score;
}

function getBestScoutZone() {

    if (!scouts || scouts.length === 0) return null;

    // Score + filter strong scouts
    const goodScouts = scouts.filter(s => {
        const score = scoreScout(s);
        return score >= 50 && s.lat && s.lon;
    });

    if (goodScouts.length === 0) return null;

    let avgLat = 0;
    let avgLon = 0;

    goodScouts.forEach(s => {
        avgLat += s.lat;
        avgLon += s.lon;
    });

    avgLat /= goodScouts.length;
    avgLon /= goodScouts.length;

    return {
        lat: avgLat,
        lon: avgLon,
        strength: goodScouts.length >= 3 ? "strong" : "normal",
        count: goodScouts.length
    };
}

function drawScoutZone() {
    const zone = getBestScoutZone();
    if (!zone || !mapInstance) return;

    if (window.scoutZoneCircle) {
        mapInstance.removeLayer(window.scoutZoneCircle);
    }

    window.scoutZoneCircle = L.circle([zone.lat, zone.lon], {
        radius: zone.strength === "strong" ? 50 : 30,
        color: "#00ff88",
        fillOpacity: 0.25
    }).addTo(mapInstance);
}

// Get best zone center from drops
function getBestZone() {

    if (!drops || drops.length === 0) return null;

    // Only strong drops
    const goodDrops = drops.filter(d => d.spi >= 65 && d.lat && d.lon);

    if (goodDrops.length === 0) return null;

    let avgLat = 0;
    let avgLon = 0;

    goodDrops.forEach(d => {
        avgLat += d.lat;
        avgLon += d.lon;
    });

    avgLat /= goodDrops.length;
    avgLon /= goodDrops.length;

    return {
        lat: avgLat,
        lon: avgLon,
        strength: goodDrops.length >= 3 ? "strong" : "normal",
        count: goodDrops.length
    };
}


// =====================================================
// 🎯 SPI DIRECTION ZONE (UI TICKS)
// =====================================================
function setFishingZone(targetAngle) {

    const ticks = document.querySelectorAll(".tick");
    if (!ticks.length) return;

    const zoneData = getBestZone();
    const zoneStrength = zoneData?.strength || "normal";

    ticks.forEach(tick => {

        const angle = parseInt(tick.dataset.angle);
        let diff = Math.abs(angle - targetAngle);
        if (diff > 180) diff = 360 - diff;

        const zoneWidth = zoneStrength === "strong" ? 35 : 20;

        tick.classList.remove("active-zone", "active-zone-strong");

        if (diff < zoneWidth) {
            tick.classList.add(
                zoneStrength === "strong"
                    ? "active-zone-strong"
                    : "active-zone"
            );
        }

    });
}

// 🌊 DAM
let damData = {
    name: "",
    type: "",        // lake, river, dam
    avgDepth: 0,
    clarity: "",
    structure: [],   // weed, rocks, dropoffs
    notes: ""
};

function saveDamData(data){
    localStorage.setItem("damData", JSON.stringify(data)); }

function loadDamData(){
    return JSON.parse(localStorage.getItem("damData")) || {}; }

function openDam(){

    let screen = document.getElementById("damScreen");
    if (!screen) return;

    screen.classList.remove("hidden");   // 🔥 IMPORTANT
    document.body.style.overflow = "hidden";

    screen.innerHTML = `
        <div class="scout-card">

            <div class="scout-title">Dam Setup</div>

            <input placeholder="Dam Name" id="damName">

            <select id="damType">
                <option value="dam">Dam</option>
                <option value="lake">Lake</option>
                <option value="river">River</option>
            </select>

            <input placeholder="Avg Depth (m)" id="damDepth">

            <select id="damClarity">
                <option value="clear">Clear</option>
                <option value="stained">Stained</option>
                <option value="murky">Murky</option>
            </select>

            <div class="scout-actions">
                <button onclick="saveDam()" class="btn primary">Save</button>
                <button onclick="closeDam()" class="btn secondary">Close</button> 
            </div>

        </div>
    `;
}

function saveDam(){

    let data = {
        name: document.getElementById("damName").value,
        type: document.getElementById("damType").value,
        avgDepth: parseFloat(document.getElementById("damDepth").value),
        clarity: document.getElementById("damClarity").value
    };

    localStorage.setItem("damData", JSON.stringify(data));

    alert("Dam saved ✔");
}

function closeDam(){
    let screen = document.getElementById("damScreen");
    if (screen) {
        screen.classList.add("hidden");
    }
    document.body.style.overflow = "auto"; 
}



// 🌊 PLAN
function openPlan(){

    let dam = loadDamData();

    let plan = [];

    if (SPI > 70){
        plan.push("Fish shallow windward bank");
    } else if (SPI > 50){
        plan.push("Target mid-depth transitions");
    } else {
        plan.push("Focus deeper structure");
    }

    if (dam.avgDepth > 5){
        plan.push("Look for drop-offs");
    }

    if (dam.clarity === "clear"){
        plan.push("Use natural bait, fish cautious");
    }

    document.getElementById("planScreen").innerHTML = `
        <div class="scout-card">
            <div class="scout-title">Fishing Plan 🎯</div>
            <div>${plan.join("<br>")}</div>
            <button onclick="closePlan()" class="btn primary">Close</button>
        </div>
    `;

    document.getElementById("planScreen").classList.remove("hidden");
}

function closePlan(){
    let screen = document.getElementById("planScreen");
    if (screen) {
        screen.classList.add("hidden");
    }
    document.body.style.overflow = "auto"; 
} 

document.addEventListener("DOMContentLoaded", function() {

  const svg = document.getElementById("spiGauge");
  if (!svg) return;

for (let i = 0; i < 360; i += 15) {

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

    line.setAttribute("x1", "150");
    line.setAttribute("y1", "15");
    line.setAttribute("x2", "150");
    line.setAttribute("y2", "30");

    line.setAttribute("stroke", "white");
    line.setAttribute("stroke-width", (i % 90 === 0 ? 3 : 1).toString());
    line.setAttribute("opacity", "0.3");

    line.setAttribute("transform", "rotate(" + i + " 150 150)");

    svg.appendChild(line);
}
});

function showInsight(SPI, env, conf, light, depth) {

    const el = document.getElementById("aiContent");
    if (!el) return;

    let tips = [];

    if (!SPI || SPI === 0) {
        el.innerHTML = "Loading conditions....";
        return;
    }
    
    // 🎯 SPI BASED
    if (SPI > 75) {
        tips.push("🔥 High feeding activity expected");
        tips.push("🎯 Fish windward banks");
        tips.push("🍬 Use high-attract bait");
    } 
    else if (SPI > 55) {
        tips.push("👍 Moderate activity");
        tips.push("📍 Focus transition zones");
        tips.push("🎣 Balanced baiting strategy");
    } 
    else {
        tips.push("⚠️ Low activity");
        tips.push("🔍 Search deeper structure");
        tips.push("🧪 Use single hookbait");
    }

    // 🌞 LIGHT
    if (light > 70) {
        tips.push("🌞 Bright — fish deeper or shaded areas");
    } else {
        tips.push("🌅 Low light — fish shallow margins");
    }

    // 🌊 DEPTH
    if (depth >= 2 && depth <= 5) {
        tips.push("📏 Ideal depth — patrol routes active");
    }

    // 🧠 CONFIDENCE
    if (conf > 80) {
        tips.push("🧠 Stay consistent — pattern is reliable");
    } else {
        tips.push("🧠 Be ready to adapt");
    }

    el.innerHTML = tips.map(t => `<div class="ai-tip">${t}</div>`).join("");
}

// ============================
// 🗑 CLEAR MAP SCOUTS (VISUAL ONLY)
// ============================
document.getElementById("clearMapBtn")?.addEventListener("click", () => {
    if (!window.scoutMarkers) return;

    window.scoutMarkers.forEach(m => mapInstance.removeLayer(m));
    window.scoutMarkers = [];

    console.log("Map cleared (visual only)"); 
});

// ============================
// ❌ CLOSE MAP
// ============================

    document.getElementById("closeMapBtn")?.addEventListener("click", () => {
    closeMap();
});

window.retryConnection = retryConnection;
window.startScan = startScan;

window.closeScout = closeScout;
