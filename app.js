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
let userLocation = {
    lat: null,
    lon: null
};

let mapInstance = null;
let userMarker = null;
let currentCompass = 0;

const userIcon = L.icon({
    iconUrl: "https://urldefense.com/v3/__https://maps.google.com/mapfiles/ms/icons/green-dot.png__;!!LtDMhTYuqQ!W8JZzZR__DiKd7BV09QoDEwIQaqKeMPmTS0JyzSQq9DvjhN4RbYeuqTAYvvntg8jerHJo9AA3fMtU9BWOi7P3P1m$ ",
    iconSize: [36, 36],
    iconAnchor: [18, 36]
});

const dropIcon = L.icon({
    iconUrl: "https://urldefense.com/v3/__https://maps.google.com/mapfiles/ms/icons/blue-dot.png__;!!LtDMhTYuqQ!W8JZzZR__DiKd7BV09QoDEwIQaqKeMPmTS0JyzSQq9DvjhN4RbYeuqTAYvvntg8jerHJo9AA3fMtU9BWOsmhm_to$ ",
    iconSize: [24, 24],
    iconAnchor: [12, 24]
});

const scoutIcon = L.icon({
    iconUrl: "https://urldefense.com/v3/__https://maps.google.com/mapfiles/ms/icons/orange-dot.png__;!!LtDMhTYuqQ!W8JZzZR__DiKd7BV09QoDEwIQaqKeMPmTS0JyzSQq9DvjhN4RbYeuqTAYvvntg8jerHJo9AA3fMtU9BWOpGUN9U-$ ",
    iconSize: [28, 45],
    iconAnchor: [14, 45]
});

// ============================
// 🌍 GLOBAL MARKERS
// ============================
window.scoutMarkers = window.scoutMarkers || []; window.dropMarkers = window.dropMarkers || [];

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

// ============================
// 📡 DATA SOURCE TRACKING
// ============================
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
// 📊 FORECAST
// ============================
let forecastData = [
    { date: "Today", spi: 60 },
    { date: "Tomorrow", spi: 72 },
    { date: "Day 3", spi: 78 }
];

// ============================
// 📊 SCORES
// ============================
let envScore = 0;
let confScoreValue = 0;
let scoutScore = 50;

// ============================
// 📈 HISTORY TRACKING
// ============================
let tempHistory = [];
let pressureHistory = [];

// ============================
// 🌊 VISUAL ENGINE
// ============================
let canvas;
let ctx;

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
let retryCount = 0;

// ============================
// 💾 GLOBAL STORAGE ARRAYS
// ============================
window.scouts = [];
window.drops = [];

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
// 💾 LOAD SCOUT STORAGE
// =====================================================
try {

    const storedScouts = localStorage.getItem("scouts");

    if (storedScouts) {

        window.scouts = JSON.parse(storedScouts);

        if (!Array.isArray(window.scouts)) {
            throw new Error("Scout storage invalid");
        }
    }

} catch (e) {

    console.warn("⚠️ Corrupt scout storage reset:", e);

    window.scouts = [];

    localStorage.removeItem("scouts");
}

// =====================================================
// 💾 LOAD DROP STORAGE
// =====================================================
try {

    const storedDrops = localStorage.getItem("drops");

    if (storedDrops) {

        window.drops = JSON.parse(storedDrops);

        if (!Array.isArray(window.drops)) {
            throw new Error("Drop storage invalid");
        }
    }

} catch (e) {

    console.warn("⚠️ Corrupt drop storage reset:", e);

    window.drops = [];

    localStorage.removeItem("drops");
}

// =====================================================
// 🌍 0. GLOBAL BASE END
// =====================================================


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

        if (i % 90 === 0) {
            tick.classList.add("tick-major");
        }
        else if (i % 15 === 0) {
            tick.classList.add("tick-medium");
        }
        else {
            tick.classList.add("tick-small");
        }

        tick.dataset.angle = i;

        tick.style.transform =
            `translate(-50%, -50%) rotate(${i}deg) translateY(-125px)`;

        container.appendChild(tick);
    }
}

// ================= GPS POSITION ================= 
function positionDirections() {

    const labels = document.querySelectorAll(".direction-label");

    const radius = 130;

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

    el.addEventListener("mouseup", () => {
        clearTimeout(timer);
    });

    el.addEventListener("mouseleave", () => {
        clearTimeout(timer);
    });
}

// ================= INSIGHTS ================= 
function showENVInsight() {
    alert("ENV Insight coming soon..."); }

function showCONFInsight() {
    alert("Confidence Insight coming soon..."); }

// =====================================================
// 🧩 2. UI HELPERS END
// =====================================================

// =====================================================
// 💾 LOAD DROPS
// =====================================================

function loadDrops() {

    try {

        const stored =
            localStorage.getItem("drops");

        if (!stored) {
            drops = [];
            return;
        }

        const parsed = JSON.parse(stored);

        if (!Array.isArray(parsed)) {

            console.warn("⚠️ Invalid drops format");

            drops = [];

            localStorage.removeItem("drops");

            return;
        }

        drops = parsed;

        console.log("✅ Drops loaded:", drops.length);

    } catch (e) {

        console.warn("⚠️ Corrupt drops storage");

        drops = [];

        localStorage.removeItem("drops");
    }
}

// =====================================================
// 🔄 RETRY SENSOR CONNECTION
// =====================================================

function retryConnection() {

    retryCount++;

    const status =
        document.getElementById("sensorStatusList");

    if (retryCount > 5) {

        if (status) {
            status.innerHTML =
                "❌ Unable to connect. Check AIF WiFi.";
        }

        return;
    }

    if (status) {
        status.innerHTML =
            `Reconnecting... (${retryCount}/5)`;
    }

    setTimeout(() => {

        checkSensors();

    }, 1000);
}


// =====================================================
// 🚀 3. APP BOOT
// =====================================================
document.addEventListener("DOMContentLoaded", () => {

// ============================
// 🧹 CLEAR SCOUTS
// ============================
document.getElementById("clearBtn")?.addEventListener("click", () => {

    if (!confirm("Clear all scouts?")) return;

    // 🔥 CLEAR MEMORY
    window.scouts = [];

    // 🔥 CLEAR STORAGE
    localStorage.removeItem("scouts");

    // 🔥 REMOVE MAP MARKERS
    if (window.scoutMarkers && mapInstance) {

        window.scoutMarkers.forEach(marker => {

            try {
                mapInstance.removeLayer(marker);
            } catch (err) {
                console.warn("Scout marker remove failed:", err);
            }

        });

        window.scoutMarkers = [];
    }

    // 🔥 FORCE REFRESH
    if (typeof renderScouts === "function") {
        renderScouts();
    }

    console.log("🧹 Scouts FULLY cleared");

    alert("All scouts cleared");
});

// ============================
// 🎯 CLEAR DROPS
// ============================
document.getElementById("clearDropBtn")?.addEventListener("click", () => {

    if (!confirm("Clear all drops?")) return;

    // ============================
    // 🔥 CLEAR MEMORY
    // ============================
    window.drops = [];

    // ============================
    // 🔥 CLEAR STORAGE
    // ============================
    localStorage.removeItem("drops");

    // ============================
    // 🔥 REMOVE DROP MARKERS
    // ============================
    if (window.dropMarkers && mapInstance) {

        window.dropMarkers.forEach(marker => {

            try {
                mapInstance.removeLayer(marker);
            } catch (err) {
                console.warn("Drop marker remove failed:", err);
            }

        });

        window.dropMarkers = [];
    }

    console.log("🎯 Drops FULLY cleared");

    alert("All drops cleared");

});

// ============================
// 🔧 INIT CORE
// ============================
loadDrops();

if (typeof loadScouts === "function") {
    loadScouts();
}

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

// ============================
// 🧭 STATE
// ============================

let smoothHeading = 0;
let compassEnabled = false;

// ============================
// 🧭 DIRECTION TEXT
// ============================
function getDirection(deg) {

    if (deg >= 337.5 || deg < 22.5) return "N";
    if (deg < 67.5) return "NE";
    if (deg < 112.5) return "E";
    if (deg < 157.5) return "SE";
    if (deg < 202.5) return "S";
    if (deg < 247.5) return "SW";
    if (deg < 292.5) return "W";

    return "NW";
}

// ============================
// 🧭 NORMALIZE ANGLE
// ============================
function normalizeHeading(angle) {

    angle = angle % 360;

    if (angle < 0) {
        angle += 360;
    }

    return angle;
}

// ============================
// 🧭 ENABLE COMPASS
// ============================
function enableCompass() {

    if (compassEnabled) return;

    // ============================
    // 📱 iPhone / iOS
    // ============================
    if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"
    ) {

        DeviceOrientationEvent.requestPermission()
            .then(permission => {

                if (permission === "granted") {

                    startCompass();

                } else {

                    console.warn("❌ Compass permission denied");

                }

            })
            .catch(err => {
                console.error("Compass permission error:", err);
            });

    }

    // ============================
    // 🤖 Android / Normal
    // ============================
    else {

        startCompass();

    }
}

// ============================
// 🧭 START LISTENER
// ============================
function startCompass() {

    if (compassEnabled) return;

    compassEnabled = true;

    window.addEventListener(
        "deviceorientation",
        handleCompassOrientation,
        true
    );

    console.log("🧭 Compass enabled");
}

// ============================
// 🧭 HANDLE ORIENTATION
// ============================
function handleCompassOrientation(event) {

    let heading = null;

    // ============================
    // 🍎 iPhone SAFARI
    // ============================
    if (event.webkitCompassHeading != null) {

        heading = event.webkitCompassHeading;

    }

    // ============================
    // 🤖 Android
    // ============================
    else if (event.alpha != null) {

        heading = 360 - event.alpha;

    }

    // ============================
    // ❌ INVALID
    // ============================
    if (heading == null || isNaN(heading)) return;

    heading = normalizeHeading(heading);

    // ============================
    // 🌊 SMOOTHING
    // ============================
    smoothHeading += (heading - smoothHeading) * 0.15;

    smoothHeading = normalizeHeading(smoothHeading);

    compassHeading = smoothHeading;

    updateCompass(compassHeading);
}

// ============================
// 🧭 UPDATE UI
// ============================
function updateCompass(heading) {

    if (heading == null || isNaN(heading)) return;

    // ============================
    // 🧭 ROTATE RING
    // ============================
    const compass =
        document.querySelector(".compass-ring");

    if (!compass) return; 

        currentCompass = 
            currentCompass +
            ((heading - currentCompass) * 0.15);
        
        compass.style.transform =
            `rotate(${currentCompass}deg)`;


    // ============================
    // 🧭 UPDATE TICKS
    // ============================
    updateDirectionTicks(heading);

    // ============================
    // 🎣 WIND ZONE
    // ============================
    if (typeof setFishingZone === "function") {

        setFishingZone(windDir);

    }
}
// ============================
// 🧭 TICK HIGHLIGHTING
// ============================
function updateDirectionTicks(heading) {

    const ticks =
        document.querySelectorAll("#compassTicks .tick");

    ticks.forEach(tick => {

        const angle =
            parseFloat(tick.dataset.angle);

        let difference =
            Math.abs(angle - heading);

        // ============================
        // 🔄 WRAP 360
        // ============================
        difference =
            Math.min(difference, 360 - difference);

        // ============================
        // 🎯 ACTIVE
        // ============================
        if (difference < 6) {

            tick.style.opacity = "1";
            tick.style.height = "16px";

        }

        // ============================
        // 🌊 NEARBY
        // ============================
        else if (difference < 15) {

            tick.style.opacity = "0.65";
            tick.style.height = "12px";

        }

        // ============================
        // ⚫ NORMAL
        // ============================
        else {

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

// ============================
// 🎯 CONDITION TEXT
// ============================
function getConditionText(SPI, envScore) {

    const combined =
        ((SPI || 0) + (envScore || 0)) / 2;

    if (combined >= 85)
        return "🔥 Conditions are excellent — fish should feed";

    if (combined >= 70)
        return "👍 Conditions are good — fish active";

    if (combined >= 55)
        return "👌 Conditions are fair — some movement";

    if (combined >= 45)
        return "⚠️ Conditions are slow — bites limited";

    if (combined >= 30)
        return "⚠️ Very slow — expect minimal activity";

    return "❄️ Tough conditions — very quiet"; }

// ============================
// 📍 ZONE ADVICE
// ============================
function getZoneText(SPI, light, depth, wind) {

    light = Number(light) || 0;
    depth = Number(depth) || 0;
    wind = Number(wind) || 0;

    if (SPI >= 75 && wind >= 5) {
        return "📍 Focus shallow windward zones";
    }

    if (light >= 70) {
        return "📍 Fish deeper cooler water";
    }

    if (depth >= 2 && depth <= 5) {
        return "📍 Target mid-depth transitions";
    }

    return "📍 Search structure and edges"; }

// ============================
// 🧠 CONFIDENCE
// ============================
function getConfidenceText(SPI, confScore) {

    SPI = Number(SPI) || 0;
    confScore = Number(confScore) || 0;

    if (SPI >= 75 && confScore >= 75) {
        return "🧠 Stay on your spots — be patient";
    }

    if (SPI >= 60) {
        return "🧠 Give it time before changing";
    }

    if (SPI < 50) {
        return "🧠 Consider changing approach";
    }

    return "🧠 Monitor and adjust if needed"; }

// ============================
// ⚡ MOMENTUM
// ============================
function getXFactor(SPI, prevSPI) {

    if (prevSPI == null) return null;

    const difference = SPI - prevSPI;

    if (difference >= 8) {
        return "⚡ Conditions improving — get ready";
    }

    if (SPI >= 85) {
        return "🚀 Prime feeding window now";
    }

    return null;
}

// ============================
// 🎯 MAIN UPDATE
// ============================
function updateTacticalBar(
    SPI,
    envScore,
    confScore,
    ENV,
    prevSPI,
    forecastData
) {

    const tacticalLines = [

        getConditionText(SPI, envScore),

        getZoneText(
            SPI,
            ENV?.light,
            ENV?.depth,
            ENV?.wind
        ),

        getConfidenceText(SPI, confScore)

    ];

    // ============================
    // 🔒 WINDOW
    // ============================
    const bestWindow =
        getStableWindow(forecastData);

    const windowText =
        getWindowText(bestWindow);

    if (windowText) {

        tacticalLines.splice(
            1,
            0,
            SPI >= 80
                ? "🔥 " + windowText
                : windowText
        );
    }

    // ============================
    // ⚡ MOMENTUM
    // ============================
    const extra =
        getXFactor(SPI, prevSPI);

    if (extra) {
        tacticalLines.push(extra);
    }

    // ============================
    // 🖥️ UPDATE UI
    // ============================
    const tacticalEl =
        document.getElementById("tactical");

    if (tacticalEl) {

        tacticalEl.innerText =
            tacticalLines.join("\n");

    }
}

// =====================================================
// 🎯 7. TACTICAL ENGINE END
// =====================================================


// =====================================================
// 🔒 8. WINDOW ENGINE
// =====================================================

// ============================
// 🎣 BEST WINDOW
// ============================
function getBestFishingWindow(forecastData) {

    if (
        !Array.isArray(forecastData) ||
        forecastData.length < 3
    ) {
        return null;
    }

    let bestAverage = 0;
    let bestWindow = null;

    for (let i = 0; i <= forecastData.length - 3; i++) {

        const average = (

            forecastData[i].spi +
            forecastData[i + 1].spi +
            forecastData[i + 2].spi

        ) / 3;

        if (average > bestAverage) {

            bestAverage = average;

            bestWindow = {
                start: forecastData[i].date,
                end: forecastData[i + 2].date,
                avgSPI: average
            };
        }
    }

    return bestWindow;
}

// ============================
// 🔒 STABLE WINDOW
// ============================
function getStableWindow(forecastData) {

    const bestWindow =
        getBestFishingWindow(forecastData);

    if (!bestWindow) return null;

    try {

        localStorage.setItem(
            "bestWindow",
            JSON.stringify(bestWindow)
        );

    } catch (err) {

        console.warn(
            "Window storage failed:",
            err
        );

    }

    return bestWindow;
}

// ============================
// 📝 WINDOW TEXT
// ============================
function getWindowText(bestWindow) {

    if (!bestWindow) return null;

    const avgSPI =
        Number(bestWindow.avgSPI) || 0;

    if (avgSPI < 50) {

        return `⚠️ Weak window: ${bestWindow.start} → ${bestWindow.end}`;

    }

    if (avgSPI < 65) {

        return `🎯 Moderate window: ${bestWindow.start} → ${bestWindow.end}`;

    }

    return `🔥 Strong feeding window: ${bestWindow.start} → ${bestWindow.end}`; }

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

let animationRunning = false;

// ============================
// 🌊 RIPPLE
// ============================
function ripple() {

    if (!canvas) return;

    if (ripples.length > 20) {
        ripples.shift();
    }

    ripples.push({
        r: 0,
        alpha: 0.3,
        x: canvas.width / 2,
        y: canvas.height * 0.7
    });
}

// ============================
// 🫧 SPAWN BUBBLE
// ============================
function spawnBubble() {

    if (
        !canvas ||
        !hotspots.length
    ) return;

    if (bubbles.length > 120) return;

    const hotspot =
        hotspots[
            Math.floor(
                Math.random() * hotspots.length
            )
        ];

    const spiFactor =
        Math.max(0, Math.min(1, SPI / 100));

    bubbles.push({

        x: hotspot.x,

        y: canvas.height,

        size:
            (Math.random() * 4 + 2) *
            (0.6 + spiFactor),

        speed:
            (Math.random() * 0.8 + 0.3) *
            (0.5 + spiFactor),

        drift:
            (Math.random() - 0.5) * 0.6,

        alpha:
            0.25 + (spiFactor * 0.3)

    });
}

// ============================
// 🎞️ MAIN ANIMATION
// ============================
function animate() {

    if (animationRunning) return;
    animationRunning = true;

    function frame() {

        if (!ctx || !canvas) {
            requestAnimationFrame(frame);
            return;
        }

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        // ============================
        // 🧭 COMPASS TICKS
        // ============================
        if (
            typeof updateDirectionTicks === "function"
        ) {
            updateDirectionTicks(
                compassHeading || 0
            );
        }

        // ============================
        // 🫧 BUBBLE SPAWN
        // ============================
        const spawnRate =
            0.02 +
            (bubbleIntensity * 0.08);

        if (Math.random() < spawnRate) {
            spawnBubble();
        }

        // ============================
        // 🫧 UPDATE BUBBLES
        // ============================
        for (let i = bubbles.length - 1; i >= 0; i--) {

            const b = bubbles[i];

            if (
                b.x == null ||
                b.y == null
            ) {
                bubbles.splice(i, 1);
                continue;
            }

            b.y -= b.speed;
            b.x += b.drift;

            // natural wobble
            b.x +=
                Math.sin(b.y * 0.02) * 0.3;

            const size = b.size || 6;

            if (
                !isFinite(b.x) ||
                !isFinite(b.y) ||
                !isFinite(size)
            ) {
                bubbles.splice(i, 1);
                continue;
            }

            const gradient =
                ctx.createRadialGradient(
                    b.x - size * 0.4,
                    b.y - size * 0.4,
                    0,
                    b.x,
                    b.y,
                    size
                );

            gradient.addColorStop(
                0,
                `rgba(255,255,255,${b.alpha})`
            );

            gradient.addColorStop(
                0.3,
                `rgba(200,230,255,${b.alpha * 0.6})`
            );

            gradient.addColorStop(
                0.7,
                `rgba(180,220,255,${b.alpha * 0.2})`
            );

            gradient.addColorStop(
                1,
                `rgba(180,220,255,0)`
            );

            ctx.fillStyle = gradient;

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

            // remove offscreen
            if (b.y < -20) {
                bubbles.splice(i, 1);
            }
        }

        // ============================
        // 🌊 UPDATE RIPPLES
        // ============================
        for (let i = ripples.length - 1; i >= 0; i--) {

            const r = ripples[i];

            r.r += 2;
            r.alpha *= 0.95;

            ctx.strokeStyle =
                `rgba(255,255,255,${r.alpha})`;

            ctx.beginPath();

            ctx.arc(
                r.x,
                r.y,
                r.r,
                0,
                Math.PI * 2
            );

            ctx.stroke();

            if (r.alpha < 0.01) {
                ripples.splice(i, 1);
            }
        }

        requestAnimationFrame(frame);
    }

    frame();
}

// ============================
// 🎯 HOTSPOTS
// ============================
function generateHotspots() {

    if (
        !canvas ||
        !canvas.width
    ) {
        console.warn(
            "Canvas not ready yet"
        );
        return;
    }

    hotspots = [];

    const hotspotCount =
        Math.min(
            30,
            Math.floor(canvas.width / 40)
        );

    for (let i = 0; i < hotspotCount; i++) {

        hotspots.push({

            x:
                canvas.width *
                Math.random(),

            y:
                canvas.height * 0.7,

            radius: 80

        });
    }
}

// =====================================================
// 🌦 WEATHER ENGINE
// =====================================================

const WEATHER_API_KEY =
    "63ba514dc7c2242cb10cd2632d2569ad";

// ============================
// 🌦 SAFE WEATHER FETCH
// ============================
async function fetchWeatherSafe() {

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, 7000);

    try {

        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=-26.2&lon=28.0&units=metric&appid=${WEATHER_API_KEY}`,
            {
                signal: controller.signal
            }
        );

        clearTimeout(timeout);

        // 🔒 HTTP VALIDATION
        if (!response.ok) {
            throw new Error(
                `Weather API Error: ${response.status}`
            );
        }

        const data = await response.json();

        console.log(
            "✅ LIVE WEATHER ACTIVE",
            data
        );

        // 🔒 PAYLOAD VALIDATION
        if (
            !data ||
            !data.main ||
            !data.wind ||
            !data.clouds
        ) {
            throw new Error(
                "Invalid weather payload"
            );
        }

        // 🔒 CACHE LAST GOOD DATA
        lastConditions = data;

        console.log(
            "🌦 Weather loaded successfully"
        );

        renderDashboard(data);

    } catch (err) {

        clearTimeout(timeout);

        console.warn(
            "⚠️ Weather fallback active",
            err
        );

        // ============================
        // 🔒 USE LAST GOOD WEATHER
        // ============================
        if (
            lastConditions &&
            lastConditions.main
        ) {

            console.log(
                "♻️ Using cached weather"
            );

            renderDashboard(
                lastConditions
            );

            return;
        }

        // ============================
        // 🔒 FINAL SAFE FALLBACK
        // ============================
        console.log(
            "🛟 Using simulated fallback weather"
        );

        renderDashboard({

            main: {
                temp: 22,
                pressure: 1018
            },

            wind: {
                speed: 3,
                deg: 180
            },

            clouds: {
                all: 40
            }

        });
    }
}


// ============================
// 🌦 WEATHER → ENV
// ============================
function updateFromWeather(data) {

    if (!data?.main) return;

    if (ENV.air == null) {

        ENV.air =
            data.main.temp;

        SOURCE.air =
            "weather";
    }

    if (ENV.pressure == null) {

        ENV.pressure =
            data.main.pressure;

        SOURCE.pressure =
            "weather";
    }

    if (
        ENV.wind == null &&
        data.wind
    ) {

        ENV.wind =
            data.wind.speed * 3.6;

        SOURCE.wind =
            "weather";
    }

    if (
        ENV.cloud == null &&
        data.clouds
    ) {

        ENV.cloud =
            data.clouds.all;

        SOURCE.cloud =
            "weather";
    }
}

// ============================
// 🌡 DERIVED VALUES
// ============================
function calculateDerivedValues() {

    // ============================
    // 🌊 WATER TEMPS
    // ============================
    if (
        ENV.surface == null ||
        ENV.bottom == null
    ) {

        const temps =
            calculateWaterTemps(
                ENV.air || 22
            );

        if (ENV.surface == null) {

            ENV.surface =
                temps.surface;

            SOURCE.surface =
                "model";
        }

        if (ENV.bottom == null) {

            ENV.bottom =
                temps.bottom;

            SOURCE.bottom =
                "model";
        }
    }

    // ============================
    // 💨 OXYGEN
    // ============================
    const temp =
        Number(ENV.surface) || 20;

    const wind =
        Number(ENV.wind) || 0;

    const cloud =
        Number(ENV.cloud) || 50;

    let oxygen =
        14.6 -
        (temp * 0.4);

    oxygen += wind * 0.1;
    oxygen += cloud * 0.02;

    ENV.oxygen =
        Math.max(
            5,
            Math.min(14, oxygen)
        );

    SOURCE.oxygen =
        "calculated";

    // ============================
    // ☀️ LIGHT
    // ============================
    if (ENV.light == null) {

        const hour =
            new Date().getHours();

        if (
            hour >= 6 &&
            hour <= 10
        ) {
            ENV.light = 60;
        }

        else if (
            hour >= 17 &&
            hour <= 20
        ) {
            ENV.light = 65;
        }

        else if (
            hour >= 10 &&
            hour <= 16
        ) {
            ENV.light = 85;
        }

        else {
            ENV.light = 20;
        }

        SOURCE.light =
            "calculated";
    }
}

// ============================
// 🧠 WEATHER ANALYSIS
// ============================
function analyzeWeather(w, p, c) {

    const insights = [];

    const zone =
        getBestZone();

    if (zone === "shallow") {
        insights.push(
            "Target shallow windward zones"
        );
    }

    if (zone === "mid") {
        insights.push(
            "Fish mid-depth transition areas"
        );
    }

    if (zone === "deep") {
        insights.push(
            "Focus on deeper structure"
        );
    }

    if (w >= 5 && w <= 15) {
        insights.push(
            "Wind pushing food toward bank"
        );
    }

    if (p > 1015) {
        insights.push(
            "Stable pressure supports feeding"
        );
    }

    if (c >= 30 && c <= 70) {
        insights.push(
            "Cloud cover improves fish confidence"
        );
    }

    return insights;
}

// ============================
// 🌡 WATER TEMP MODEL
// ============================
function calculateWaterTemps(airTemp) {

    airTemp =
        Number(airTemp) || 22;

    let surface =
        airTemp - 1;

    if (airTemp > 25) {
        surface -= 1;
    }

    if (airTemp < 15) {
        surface += 0.5;
    }

    let bottom =
        surface - 2.5;

    if (bottom < 8) {
        bottom =
            8 +
            (airTemp * 0.1);
    }

    return {

        surface:
            parseFloat(
                surface.toFixed(1)
            ),

        bottom:
            parseFloat(
                bottom.toFixed(1)
            ),

        source:
            "forecast"

    };
}

// =====================================================
// 🌦 WEATHER ENGINE END
// =====================================================

// =====================================================
// 📊 SPI ENGINE
// =====================================================

function calculateSPI(envScore, waterScore, data) {

    let {
        p,
        w,
        c,
        t,
        light,
        depth,
        diff
    } = data;

    // =============================
    // 🛡️ SAFETY NORMALIZATION
    // =============================

    p = Number(p) || 1015;
    w = Number(w) || 0;
    c = Number(c) || 0;
    t = Number(t) || 20;
    light = Number(light) || 50;
    depth = Number(depth) || 5;
    diff = Number(diff) || 90;

    let reasons = [];

    const isCold = t <= 15;
    const trend = getPressureTrend(p);

    // =============================
    // 🧠 1. BASE = ENV + WATER FUSION
    // =============================

    let score;

    if (waterScore !== null && !isNaN(waterScore)) {

        // 🔥 TRUE FUSION
        score = (envScore * 0.6) + (waterScore * 0.4);

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

    if (t < 8 || t > 32) {
        score -= 5;
    }

    // =============================
    // 🎯 8. FINAL SHAPING
    // =============================

    score = Math.max(0, score);

    // soft curve
    score = Math.pow(score / 100, 1.1) * 100;

    score = Math.max(25, Math.min(90, score));

    // =============================
    // 🧠 REASON FILTER
    // =============================

    function filterInsights(reasons, SPI) {

        if (SPI < 45) {

            return reasons.map(r => {

                if (r.includes("feeding")) {
                    return "Limited feeding activity";
                }

                if (r.includes("advantage")) {
                    return "Conditions slightly supportive";
                }

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

    // =============================
    // 🛡️ SAFETY NORMALIZATION
    // =============================

    SPI = Number(SPI) || 50;
    envScore = Number(envScore) || 50;
    p = Number(p) || 1015;
    w = Number(w) || 0;
    c = Number(c) || 0;
    t = Number(t) || 20;

    let score = 50;

    const isCold = t <= 15;
    const trend = getPressureTrend(p);

    // =============================
    // 🟢 1. ALIGNMENT
    // =============================

    const alignment = Math.abs(SPI - envScore);

    if (alignment < 10) {
        score += 12;

    } else if (alignment < 20) {
        score += 6;

    } else {
        score -= 6;
    }

    // =============================
    // 🟢 2. STABILITY
    // =============================

    const variability = Math.abs(SPI - (lastSPI ?? SPI));

    if (variability < 5) {

        score += 12;

    } else if (variability < 10) {

        score += 6;

    } else {

        score -= 8;
    }

    // =============================
    // 🟢 3. PRESSURE RELIABILITY
    // =============================

    if (trend === "stable") {
        score += 10;

    } else if (trend === "rising") {
        score += 6;

    } else {
        score -= 4;
    }

    // =============================
    // 🟢 4. ENV SUPPORT
    // =============================

    if (envScore >= 60) {

        score += 10;

    } else if (envScore >= 45) {

        score += 6;

    } else {

        score += 2;
    }

    // =============================
    // 🟢 5. CONDITION CONSISTENCY
    // =============================

    let consistency = 0;

    if (w >= 3 && w <= 15) consistency += 4;
    if (c >= 20 && c <= 80) consistency += 3;
    if (t >= 10 && t <= 28) consistency += 3;

    score += consistency;

    // =============================
    // ❄️ 6. WINTER ADAPTATION
    // =============================

    if (isCold) {

        if (trend === "stable") {
            score += 8;
        }

        if (alignment < 15) {
            score += 6;
        }

        if (SPI >= 40 && SPI <= 60) {
            score += 6;
        }
    }

    // =============================
    // 🔴 7. REAL RISKS
    // =============================

    if (variability > 15) score -= 10;

    if (w > 20 || w < 1) score -= 6;
    if (t > 32 || t < 8) score -= 6;
    if (c > 95 || c < 5) score -= 5;

    // =============================
    // 🎯 FINAL SHAPING
    // =============================

    score = Math.max(0, score);

    score = Math.pow(score / 100, 1.1) * 100;

    if (isNaN(score)) {
        score = 50;
    }

    return Math.max(35, Math.min(95, Math.round(score))); }

// =====================================================
// 📊 CONF ENGINE END
// =====================================================

// =====================================================
// 📊 SCOUT + TILE ENGINE
// =====================================================

function calculateAverageSPI() {

    if (!drops || drops.length === 0) {
        return 0;
    }

    const validDrops = drops.filter(d =>
        d &&
        typeof d.spi === "number" &&
        !isNaN(d.spi)
    );

    if (validDrops.length === 0) {
        return 0;
    }

    const total = validDrops.reduce(
        (sum, d) => sum + d.spi,
        0
    );

    return parseFloat(
        (total / validDrops.length).toFixed(1)
    );
}

// =====================================================
// 🎣 AIF TILE ENGINE (CARP OPTIMISED)
// =====================================================

// ============================
// 🎯 MAIN UPDATE FUNCTION
// ============================

function updateAllTiles(data = {}) {

    applyTileColor(
        "airTile",
        getAirStatus(data.air)
    );

    applyTileColor(
        "surfaceTile",
        getSurfaceStatus(data.surface)
    );

    applyTileColor(
        "bottomTile",
        getBottomStatus(data.bottom)
    );

    applyTileColor(
        "depthTile",
        getDepthStatus(data.surface, data.bottom)
    );

    applyTileColor(
        "pressureTile",
        getPressureStatus(data.pressure)
    );

    applyTileColor(
        "windTile",
        getWindStatus(data.wind)
    );

    applyTileColor(
        "cloudTile",
        getCloudStatus(data.cloud)
    );

    applyTileColor(
        "oxygenTile",
        getOxygenStatus(data.oxygen, data.surface)
    );

    applyTileColor(
        "lightTile",
        getLightStatus(data.cloud, data.time)
    );
}

// =====================================================
// 🌬️ AIR TEMP
// =====================================================

function getAirStatus(temp) {

    temp = Number(temp);

    if (isNaN(temp)) return "orange";

    if (temp >= 15 && temp <= 24) return "green";
    if (temp >= 10 && temp <= 28) return "green";
    if (temp >= 7 && temp <= 24) return "orange";

    return "red";
}

// =====================================================
// 🌊 SURFACE TEMP
// =====================================================

function getSurfaceStatus(temp) {

    temp = Number(temp);

    if (isNaN(temp)) return "orange";

    if (temp >= 16 && temp <= 22) return "green";
    if (temp >= 12 && temp <= 26) return "orange";

    return "red";
}

// =====================================================
// ⬇️ BOTTOM TEMP
// =====================================================

function getBottomStatus(temp) {

    temp = Number(temp);

    if (isNaN(temp)) return "orange";

    if (temp >= 14 && temp <= 20) return "green";
    if (temp >= 10 && temp <= 24) return "orange";

    return "red";
}

// =====================================================
// 🌡️ DEPTH / MIXING
// =====================================================

function getDepthStatus(surface, bottom) {

    surface = Number(surface);
    bottom = Number(bottom);

    if (isNaN(surface) || isNaN(bottom)) {
        return "orange";
    }

    const diff = Math.abs(surface - bottom);

    if (diff <= 2) return "green";
    if (diff <= 5) return "orange";

    return "red";
}

// =====================================================
// 🌬️ PRESSURE
// =====================================================

function getPressureStatus(p) {

    p = Number(p);

    if (isNaN(p)) return "orange";

    if (p >= 1012 && p <= 1022) return "green";
    if (p >= 1005 && p <= 1028) return "orange";

    return "red";
}

// =====================================================
// 💨 WIND
// =====================================================

function getWindStatus(wind) {

    wind = Number(wind);

    if (isNaN(wind)) return "orange";

    if (wind >= 5 && wind <= 15) return "green";
    if (wind >= 2 && wind <= 20) return "orange";

    return "red";
}

// =====================================================
// ☁️ CLOUD
// =====================================================

function getCloudStatus(cloud) {

    cloud = Number(cloud);

    if (isNaN(cloud)) return "orange";

    if (cloud >= 30 && cloud <= 70) return "green";
    if (cloud >= 10 && cloud <= 90) return "orange";

    return "red";
}

// =====================================================
// 🫧 OXYGEN
// =====================================================

function getOxygenStatus(oxygen, temp) {

    oxygen = Number(oxygen);
    temp = Number(temp);

    // fallback estimation
    if (isNaN(oxygen)) {

        if (!isNaN(temp)) {

            if (temp >= 16 && temp <= 22) return "green";
            if (temp >= 12 && temp <= 26) return "orange";
        }

        return "orange";
    }

    if (oxygen >= 7) return "green";
    if (oxygen >= 5) return "orange";

    return "red";
}

// =====================================================
// ☀️ LIGHT
// =====================================================

function getLightStatus(cloud, time) {

    cloud = Number(cloud);

    // fallback to current hour
    if (time == null || isNaN(time)) {
        time = new Date().getHours();
    }

    time = Number(time);

    // 🌅 morning
    if (time >= 6 && time <= 10) {
        return "green";
    }

    // 🌇 evening
    if (time >= 17 && time <= 20) {
        return "green";
    }

    // ☁️ diffused daylight
    if (cloud >= 40 && cloud <= 80) {
        return "green";
    }

    // ☀️ harsh midday
    if (time >= 10 && time <= 16) {
        return "orange";
    }

    // 🌑 night/extreme
    return "red";
}

// =====================================================
// 🎨 APPLY COLOR ENGINE
// =====================================================

function applyTileColor(tileId, status = "orange") {

    const tile = document.getElementById(tileId);

    if (!tile) {
        console.warn("Missing Tile:", tileId);
        return;
    }

    const icon = tile.querySelector("i");

    // ============================
    // 🎨 ICON STYLING
    // ============================

    if (icon) {

        if (status === "red") {

            icon.style.color = "#ff3b3b";
            icon.style.opacity = "1";

        } else {

            icon.style.color = "#ffffff";
            icon.style.opacity = "0.6";
        }
    }

    // ============================
    // RESET
    // ============================

    tile.style.borderColor = "";
    tile.style.boxShadow = "";
    tile.style.background = "";

    // ============================
    // GREEN
    // ============================

    if (status === "green") {

        tile.style.borderColor = "#00ff9c";
        tile.style.boxShadow =
            "0 0 15px rgba(0,255,156,0.45)";
        tile.style.background =
            "rgba(0,255,156,0.05)";
    }

    // ============================
    // ORANGE
    // ============================

    else if (status === "orange") {

        tile.style.borderColor = "#ffaa00";
        tile.style.boxShadow =
            "0 0 12px rgba(255,170,0,0.35)";
        tile.style.background =
            "rgba(255,170,0,0.05)";
    }

    // ============================
    // RED
    // ============================

    else {

        tile.style.borderColor = "#ff3b3b";
        tile.style.boxShadow =
            "0 0 12px rgba(255,59,59,0.35)";
        tile.style.background =
            "rgba(255,59,59,0.05)";
    }
}

// =====================================================
// 📊 SCOUT and TILE ENGINE END
// =====================================================

// =====================================================
// 🎣 FEEDING STATUS
// =====================================================

function feeding(spi) {

    if (spi >= 80) {
        return "High Activity 🔥";
    }

    if (spi >= 60) {
        return "Active 👍";
    }

    if (spi >= 40) {
        return "Slow 😐";
    }

    return "Low Activity ❄️";
}

// =====================================================
// 📊 7. DASHBOARD (RENDER ENGINE START) 
// =====================================================

function renderDashboard(data) {

    console.log("📊 Rendering dashboard");

    // =====================================================
    // 🛡️ 1. SAFETY CHECK
    // =====================================================

    if (!data || !data.main || !data.wind || !data.clouds) {
        console.warn("Invalid dashboard data:", data);
        return;
    }

    lastConditions = data;

    // =====================================================
    // 🧠 2. INPUT NORMALISATION
    // =====================================================

    const t = Number(data.main.temp) || 20;
    const p = Number(data.main.pressure) || 1015;
    const w = (Number(data.wind.speed) || 0) * 3.6;
    const c = Number(data.clouds.all) || 0;

    const light =
        Number(ENV.light) ||
        Number(data.light) ||
        50;

    const depth =
        Number(ENV.depth) ||
        Number(data.depth) ||
        5;

    windDir = Number(data.wind?.deg) || 0;

    // =====================================================
    // 🧭 3. COMPASS DIFF
    // =====================================================

    diff = 0;

    if (compassHeading != null) {

        diff = Math.abs(windDir - compassHeading);

        if (diff > 180) {
            diff = 360 - diff;
        }
    }

    console.log("Wind vs heading:", diff);

    // =====================================================
    // 🌡️ 4. WATER MODEL
    // =====================================================

    let temps = calculateWaterTemps(t);

    if (
        tempModel &&
        tempModel.source === "sensor"
    ) {
        temps = tempModel;
    }

    const surfaceTemp =
        Number(temps.surface) || t - 1;

    const bottomTemp =
        Number(temps.bottom) || t - 3;

    // =====================================================
    // 🧭 5. WORLD SYSTEMS
    // =====================================================

    updateCompass(windDir);
    setFishingZone(windDir);

    envScore = calculateENV(
        p,
        c,
        w,
        light,
        t
    );

    // =====================================================
    // 📊 6. SPI CALCULATION
    // =====================================================

    const previousSPI = lastSPI;

    const result = calculateSPI(
        envScore,
        null,
        {
            p,
            w,
            c,
            t,
            light,
            depth,
            diff
        }
    );

    let finalSPI = Number(result.score) || 50;

    // =============================
    // 🔄 SMOOTHING
    // =============================

    if (previousSPI !== null) {

        finalSPI = Math.round(
            (finalSPI * 0.7) +
            (previousSPI * 0.3)
        );
    }

    // =============================
    // 🌍 ENV ALIGNMENT
    // =============================

    const delta = finalSPI - envScore;

    finalSPI -= delta * 0.2;

    // =============================
    // 🎯 LIMITS
    // =============================

    if (envScore < 85) {

        const cap = envScore + 12;

        if (finalSPI > cap) {

            finalSPI -=
                (finalSPI - cap) * 0.6;
        }
    }

    // =============================
    // 🎣 SCOUT IMPACT
    // =============================

    finalSPI +=
        calculateScoutImpact(scoutData) * 0.5;

    // =============================
    // FINAL CLAMP
    // =============================

    finalSPI = Math.max(
        10,
        Math.min(98, Math.round(finalSPI))
    );

    SPI = finalSPI;

    // =====================================================
    // 📊 7. CONFIDENCE
    // =====================================================

    confScoreValue = calculateCONF(
        SPI,
        envScore,
        p,
        w,
        c,
        t
    );

    lastSPI = SPI;

    // =====================================================
    // 🎨 8. COLORS
    // =====================================================

    const spiColor =
        getScoreColor(SPI);

    const envColor =
        getScoreColor(envScore);

    const confColor =
        getScoreColor(confScoreValue);

    // =====================================================
    // 🎯 9. ELEMENTS
    // =====================================================

    const spiText =
        document.getElementById("spiValue");

    const envText =
        document.getElementById("envScore");

    const confText =
        document.getElementById("confScore");

    const spiCircle =
        document.getElementById("spiCircle");

    const envCircle =
        document.getElementById("envCircle");

    const confCircle =
        document.getElementById("confCircle");

    // =====================================================
    // 🎨 10. APPLY COLORS
    // =====================================================

    if (spiText) {
        spiText.style.color = spiColor;
        spiText.innerText = SPI + "%";
    }

    if (envText) {
        envText.style.color = envColor;
        envText.innerText = envScore + "%";
    }

    if (confText) {
        confText.style.color = confColor;
        confText.innerText =
            confScoreValue + "%";
    }

    if (envCircle) {

        envCircle.style.borderColor =
            envColor;

        envCircle.style.boxShadow =
            `0 0 10px ${envColor}`;
    }

    if (confCircle) {

        confCircle.style.borderColor =
            confColor;

        confCircle.style.boxShadow =
            `0 0 10px ${confColor}`;
    }

    if (spiCircle) {
        spiCircle.style.stroke = spiColor;
    }

    // =====================================================
    // 🧠 11. ANALYSIS
    // =====================================================

    const tempAnalysis =
        analyzeTemperature(
            t,
            surfaceTemp,
            bottomTemp
        );

    const combinedReasons = [
        ...(result.reasons || []),
        ...(tempAnalysis.insights || [])
    ];

    updateTacticalBar(
        SPI,
        envScore,
        confScoreValue,
        ENV,
        previousSPI,
        forecastData || []
    );

    showInsight(
        SPI,
        envScore,
        confScoreValue,
        light,
        depth
    );

    // =====================================================
    // 🎨 12. VISUAL ENGINE
    // =====================================================

    updateSPI(SPI);

    bubbleIntensity = SPI / 100;

    // =====================================================
    // 🫧 13. OXYGEN
    // =====================================================

    const oxygen =
        estimateOxygen(t, w, c);

    const oxygenEl =
        document.getElementById("oxygen");

    if (oxygenEl) {

        oxygenEl.innerText =
            oxygen.toFixed(1) + " mg/L";
    }

    setIcon("droplets", oxygen, [
        { min: 9, max: 20, color: GREEN },
        { min: 7, max: 8.9, color: ORANGE },
        { min: 0, max: 6.9, color: RED }
    ]);

    // =====================================================
    // 📦 14. TILE ENGINE
    // =====================================================

    updateAllTiles({
        air: t,
        surface: surfaceTemp,
        bottom: bottomTemp,
        pressure: p,
        wind: w,
        cloud: c,
        oxygen,
        light,
        time: new Date().getHours()
    });

    // =====================================================
    // 📊 15. UI VALUES
    // =====================================================

    const setText = (id, value) => {

        const el =
            document.getElementById(id);

        if (el) {
            el.innerText = value;
        }
    };

    setText("air", t.toFixed(1) + "°C");
    setText("surface",
        surfaceTemp.toFixed(1) + "°C");

    setText("bottom",
        bottomTemp.toFixed(1) + "°C");

    setText("pressure", p + " hPa");

    setText("wind",
        w.toFixed(1) + " km/h");

    setText("cloud", c + "%");

    setText("feed",
        feeding(finalSPI));

    setText("light", light + "%");

    setText("depth", depth + " m");

    setText("moon",
        getMoonPhase());

    setText("season",
        getSeason());

    // =====================================================
    // 🎨 16. ICON COLORS
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
    // 🎨 17. TILE GLOW
    // =====================================================

    document
        .querySelectorAll(".tile")
        .forEach(tile => {

            tile.style.boxShadow =
                SPI >= 80

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

// ============================
// 📥 SENSOR INGEST
// ============================
function updateFromSensor(data = {}) {

    if (!data || typeof data !== "object") {
        console.warn("Invalid sensor payload");
        return;
    }

    // ============================
    // 🌊 SURFACE TEMP
    // ============================
    if (data.surfaceTemp != null && !isNaN(data.surfaceTemp)) {

        ENV.surface = Number(data.surfaceTemp);
        SOURCE.surface = "sensor";
    }

    // ============================
    // 🌊 BOTTOM TEMP
    // ============================
    if (data.bottomTemp != null && !isNaN(data.bottomTemp)) {

        ENV.bottom = Number(data.bottomTemp);
        SOURCE.bottom = "sensor";
    }

    // ============================
    // 🌡 PRESSURE
    // ============================
    if (data.pressure != null && !isNaN(data.pressure)) {

        ENV.pressure = Number(data.pressure);
        SOURCE.pressure = "sensor";
    }

    // ============================
    // 💡 LIGHT
    // ============================
    if (data.light != null && !isNaN(data.light)) {

        ENV.light = Number(data.light);
        SOURCE.light = "sensor";
    }

    // ============================
    // 🌊 DEPTH
    // ============================
    if (data.depth != null && !isNaN(data.depth)) {

        ENV.depth = Number(data.depth);
        SOURCE.depth = "sensor";
    }

    console.log("📡 Sensor data updated"); }

// =====================================================
// 📊 ENV SCORE ENGINE
// =====================================================
function calculateENV(p, c, w, light, airTemp) {

    // ============================
    // 🛡 NORMALISE INPUTS
    // ============================
    p = Number(p) || 1015;
    c = Number(c) || 50;
    w = Number(w) || 5;
    light = Number(light) || 50;
    airTemp = Number(airTemp) || 20;

    let score = 50;

    // =============================
    // 🌡 PRESSURE
    // =============================
    const trend = getPressureTrend(p);

    if (p >= 1012 && p <= 1020) {
        score += 8;
    }

    else if (p >= 1008 && p <= 1024) {
        score += 5;
    }

    else {
        score -= 5;
    }

    if (trend === "rising") {
        score += 3;
    }

    if (trend === "falling") {
        score -= 3;
    }

    // =============================
    // 🌬 WIND
    // =============================
    if (w >= 5 && w <= 15) {
        score += 8;
    }

    else if (w >= 3 && w < 20) {
        score += 5;
    }

    else if (w < 2) {
        score -= 4;
    }

    else {
        score += 2;
    }

    // =============================
    // ☁ CLOUD
    // =============================
    if (c >= 30 && c <= 70) {
        score += 6;
    }

    else if (c > 70 && c <= 90) {
        score += 4;
    }

    else if (c < 15) {
        score -= 4;
    }

    else {
        score -= 2;
    }

    // =============================
    // 💡 LIGHT
    // =============================
    if (light >= 40 && light <= 70) {
        score += 6;
    }

    else if (light < 30) {
        score += 5;
    }

    else if (light > 80) {
        score -= 4;
    }

    // =============================
    // 🌡 AIR TEMP
    // =============================
    if (airTemp >= 18 && airTemp <= 24) {
        score += 10;
    }

    else if (airTemp >= 15) {
        score += 7;
    }

    else if (airTemp >= 12) {
        score += 4;
    }

    else if (airTemp >= 10) {
        score += 2;
    }

    else {
        score -= 4;
    }

    // =============================
    // ⚡ SMART INTERACTIONS
    // =============================

    // Wind + cloud synergy
    if (w >= 5 && c >= 30) {
        score += 5;
    }

    // Lower light feeding support
    if (light < 50) {
        score += 3;
    }

    // Dead calm + bright clear
    if (w < 2 && c < 20) {
        score -= 6;
    }

    // Strong wind disruption
    if (w > 25) {
        score -= 5;
    }

    // =============================
    // ⏱ TIME FACTOR
    // =============================
    const hour = new Date().getHours();

    // Dawn
    if (hour >= 5 && hour <= 9) {
        score += 6;
    }

    // Evening
    else if (hour >= 17 && hour <= 20) {
        score += 8;
    }

    // Harsh midday
    else if (hour >= 11 && hour <= 15) {
        score -= 4;
    }

    // =============================
    // 🎯 FINAL SHAPING
    // =============================

    // soft curve = more realistic
    score = Math.pow(score / 100, 1.05) * 100;

    if (isNaN(score)) {
        score = 50;
    }

    return Math.max(
        20,
        Math.min(85, Math.round(score))
    );
}

// =====================================================
// 🌊 WATER SCORE ENGINE
// =====================================================
function calculateWaterScore(
    surfaceTemp,
    bottomTemp,
    thermoclineStart,
    thermoclineEnd,
    turbidity,
    light
) {

    // ============================
    // 🛡 SAFETY NORMALISATION
    // ============================
    surfaceTemp = Number(surfaceTemp) || 18;
    bottomTemp = Number(bottomTemp) || 15;
    turbidity = Number(turbidity) || 40;
    light = Number(light) || 50;

    let score = 0;

    // =============================
    // 🌡 WATER TEMP PROFILE
    // =============================
    const delta =
        Math.abs(surfaceTemp - bottomTemp);

    // Surface activity zone
    if (surfaceTemp >= 18 && surfaceTemp <= 24) {
        score += 15;
    }

    else if (surfaceTemp >= 15) {
        score += 12;
    }

    else if (surfaceTemp >= 12) {
        score += 9;
    }

    else {
        score += 6;
    }

    // Layering quality
    if (delta >= 2 && delta <= 5) {
        score += 10;
    }

    else if (delta > 5) {
        score += 6;
    }

    else {
        score += 4;
    }

    // =============================
    // 🌊 THERMOCLINE
    // =============================
    if (
        thermoclineStart != null &&
        thermoclineEnd != null &&
        !isNaN(thermoclineStart) &&
        !isNaN(thermoclineEnd)
    ) {

        const mid =
            (Number(thermoclineStart) +
             Number(thermoclineEnd)) / 2;

        if (mid >= 2 && mid <= 5) {
            score += 20;
        }

        else if (mid <= 7) {
            score += 15;
        }

        else {
            score += 10;
        }
    }

    // =============================
    // 🌫 TURBIDITY
    // =============================
    if (turbidity >= 30 && turbidity <= 60) {
        score += 15;
    }

    else if (turbidity < 30) {
        score += 10;
    }

    else {
        score += 8;
    }

    // =============================
    // 💡 LIGHT PENETRATION
    // =============================
    if (light >= 30 && light <= 70) {
        score += 10;
    }

    else if (light < 30) {
        score += 8;
    }

    else {
        score += 6;
    }

    // =============================
    // 🎯 FINAL CLAMP
    // =============================
    if (isNaN(score)) {
        score = 50;
    }

    return Math.max(
        0,
        Math.min(100, Math.round(score))
    );
}

// =====================================================
// 🎯 FINAL SPI FUSION
// =====================================================
function calculateFinalSPI(
    envScore,
    waterScore,
    hasSensor
) {

    envScore = Number(envScore) || 50;
    waterScore = Number(waterScore) || 50;

    // =============================
    // 🌍 ENV ONLY MODE
    // =============================
    if (!hasSensor) {

        return Math.max(
            0,
            Math.min(100, Math.round(envScore))
        );
    }

    // =============================
    // 🌊 TRUE FUSION
    // =============================
    let finalScore =
        (envScore * 0.6) +
        (waterScore * 0.4);

    // =============================
    // 🤝 ALIGNMENT BOOST
    // =============================
    if (
        envScore > 60 &&
        waterScore > 60
    ) {

        finalScore += 5;
    }

    // =============================
    // ⚠️ CONFLICT HANDLING
    // =============================
    if (
        envScore > 60 &&
        waterScore < 40
    ) {

        finalScore -= 8;
    }

    // =============================
    // 🔥 HIDDEN WATER OPPORTUNITY
    // =============================
    if (
        envScore < 40 &&
        waterScore > 60
    ) {

        finalScore += 10;
    }

    // =============================
    // 🎯 SOFT CURVE
    // =============================
    finalScore =
        Math.pow(finalScore / 100, 1.05) * 100;

    if (isNaN(finalScore)) {
        finalScore = envScore;
    }

    return Math.max(
        0,
        Math.min(100, Math.round(finalScore))
    );
}

// =====================================================
// 🧠 8. ENVIRONMENT ENGINE END
// =====================================================

// =====================================================
// 📈 TRENDS & TIME
// =====================================================

// ============================
// 🌡 TEMP TREND
// ============================
function getTempTrend(temp) {

    temp = Number(temp);

    if (isNaN(temp)) {
        return "stable";
    }

    tempHistory.push(temp);

    // Keep only latest 6 readings
    if (tempHistory.length > 6) {
        tempHistory.shift();
    }

    // Need enough data
    if (tempHistory.length < 2) {
        return "stable";
    }

    const oldest = tempHistory[0];
    const latest = tempHistory[tempHistory.length - 1];

    const diff = latest - oldest;

    if (diff >= 1.5) return "warming";
    if (diff <= -1.5) return "cooling_fast";

    return "stable";
}

// ============================
// 🌡 PRESSURE TREND
// ============================
function getPressureTrend(pressure) {

    pressure = Number(pressure);

    if (isNaN(pressure)) {
        return "stable";
    }

    pressureHistory.push(pressure);

    // Keep only latest 6 readings
    if (pressureHistory.length > 6) {
        pressureHistory.shift();
    }

    if (pressureHistory.length < 2) {
        return "stable";
    }

    const oldest = pressureHistory[0];
    const latest = pressureHistory[pressureHistory.length - 1];

    const diff = latest - oldest;

    if (diff >= 1.5) return "rising";
    if (diff <= -1.5) return "falling";

    return "stable";
}

// ============================
// 🌅 PRIME FEED WINDOW
// ============================
function sunriseWindow() {

    const hour = new Date().getHours();

    // Dawn
    if (hour >= 5 && hour <= 9) {
        return 10;
    }

    // Evening
    if (hour >= 17 && hour <= 20) {
        return 12;
    }

    return 0;
}

// ============================
// 🍂 SEASONAL WEIGHT
// ============================
function seasonalWeight() {

    const month = new Date().getMonth() + 1;

    // Summer
    if (month <= 2 || month === 12) {
        return 8;
    }

    // Autumn
    if (month <= 5) {
        return 4;
    }

    // Winter
    if (month <= 8) {
        return -4;
    }

    // Spring
    return 6;
}

// ============================
// 🍂 SEASON NAME
// ============================
function getSeason() {

    const month = new Date().getMonth() + 1;

    if (month <= 2 || month === 12) {
        return "Summer";
    }

    if (month <= 5) {
        return "Autumn";
    }

    if (month <= 8) {
        return "Winter";
    }

    return "Spring";
}

// ============================
// 🌙 MOON PHASE
// ============================
function getMoonPhase() {

    const now = new Date();

    const lunarCycle = 2551443;
    const unixNow = now.getTime() / 1000;

    const knownNewMoon = 592500;

    const phase =
        ((unixNow - knownNewMoon) % lunarCycle) / lunarCycle;

    if (phase < 0.03 || phase > 0.97) {
        return "New";
    }

    if (phase < 0.22) {
        return "Waxing";
    }

    if (phase < 0.28) {
        return "Quarter";
    }

    if (phase < 0.47) {
        return "Waxing";
    }

    if (phase < 0.53) {
        return "Full";
    }

    if (phase < 0.72) {
        return "Waning";
    }

    if (phase < 0.78) {
        return "Quarter";
    }

    return "Waning";
}

// =====================================================
// 📈 TRENDS & TIME END
// =====================================================

// =====================================================
// 🌡 TEMPERATURE ANALYSIS
// =====================================================
function analyzeTemperature(air, surface, bottom) {

    air = Number(air) || 20;
    surface = Number(surface) || air - 1;
    bottom = Number(bottom) || surface - 2;

    let score = 0;
    let insights = [];

    // ============================
    // 🌊 SURFACE CONDITIONS
    // ============================
    if (surface >= 18 && surface <= 24) {

        score += 8;
        insights.push("Surface temp optimal (18–24°C)");

    }

    else if (surface > 24) {

        score -= 4;
        insights.push("Surface temp too warm — fish may go deeper");

    }

    else {

        score -= 6;
        insights.push("Surface temp too cold — reduced activity");
    }

    // ============================
    // 🌊 THERMAL LAYERING
    // ============================
    const delta = surface - bottom;

    if (delta >= 3) {

        score -= 4;
        insights.push("Thermal drop detected — fish holding deeper");

    }

    else {

        score += 2;
        insights.push("Stable water column — good feeding movement");
    }

    // ============================
    // ❄️ COLD WATER STABILITY
    // ============================
    if (surface <= 15 && delta <= 2) {

        score += 2;
        insights.push("Stable winter water profile");
    }

    return {
        score: score,
        insights: insights
    };
}

// =====================================================
// 🎯 STRATEGY ENGINE
// =====================================================

// ============================
// 🌬 CASTING STRATEGY
// ============================
function getCastingAdvice(diff) {

    diff = Number(diff) || 0;

    if (diff < 45) {
        return "Into wind ⚠️";
    }

    if (diff > 135) {
        return "Perfect windward 🔥";
    }

    return "Crosswind ⚠️";
}

// ============================
// 🌊 DEPTH STRATEGY
// ============================
function getDepthStrategy(light, depth) {

    light = Number(light) || 50;
    depth = Number(depth) || 3;

    if (light < 30) {
        return "Fish shallow margins";
    }

    if (light > 70) {
        return "Fish deeper structure";
    }

    if (depth >= 2 && depth <= 5) {
        return "Target patrol routes";
    }

    return "Adjust depth";
}

// ============================
// 🍪 BAIT STRATEGY
// ============================
function getBaitSuggestion(SPI) {

    SPI = Number(SPI) || 50;

    if (SPI > 75) {
        return "High attract bait";
    }

    if (SPI > 60) {
        return "Balanced boilie approach";
    }

    return "Single hookbait";
}

// =====================================================
// 🎯 STRATEGY ENGINE END
// =====================================================

// =====================================================
// 🧭 9. GPS + COMPASS + MAP
// =====================================================

let watchId = null;

// ============================
// 📍 GPS INIT
// ============================
function initGPS() {

    if (!navigator.geolocation) {

        console.warn("GPS not supported");
        return;
    }

    // Prevent duplicates
    if (watchId !== null) {
        return;
    }

    watchId = navigator.geolocation.watchPosition(

        (pos) => {

            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;

            // Safety validation
            if (
                lat == null ||
                lon == null ||
                isNaN(lat) ||
                isNaN(lon)
            ) {

                console.warn("Invalid GPS fix");
                return;
            }

            userLocation = { lat, lon };

            console.log("📍 GPS Fix:", lat, lon);

            // Update map live
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
// 🗺️ MAP CORE
// ============================
let followUser = true;
let interactionTimeout = null;
let bestZoneCircle = null;

// ============================
// 🗺️ OPEN MAP
// ============================
function openMap() {

    const mapScreen =
        document.getElementById("mapScreen");

    if (!mapScreen) {
        return;
    }

    mapScreen.classList.remove("hidden");

    document.body.style.overflow = "hidden";

    setTimeout(() => {

        // ============================
        // 📍 SAFE LOCATION
        // ============================
        let lat = userLocation?.lat;
        let lon = userLocation?.lon;

        if (
            lat == null ||
            lon == null ||
            isNaN(lat) ||
            isNaN(lon)
        ) {

            console.warn("GPS fallback used");

            lat = -26.2;
            lon = 28.0;
        }

        // ============================
        // 🗺️ CREATE MAP
        // ============================
        if (!mapInstance) {

            mapInstance = L.map("mapContainer", {
                zoomControl: true
            }).setView([lat, lon], 13);

            L.tileLayer(
                "https://urldefense.com/v3/__https://*7Bs*7D.tile.openstreetmap.org/*7Bz*7D/*7Bx*7D/*7By*7D.png__;JSUlJSUlJSU!!LtDMhTYuqQ!WcgL4Rx00PoXCL91yDa5k9-cF7Avku31Pk44UeWkHU21tcxEcyHXGMn89kuy_ix4moXX3xt7d2KH60fOr_W7k4aN$ ",
                {
                    attribution: "",
                    maxZoom: 19
                }
            ).addTo(mapInstance);

            // ============================
            // 👆 USER INTERACTION
            // ============================
            mapInstance.on(
                "dragstart zoomstart",
                () => {

                    followUser = false;
                }
            );

            mapInstance.on(
                "moveend zoomend",
                () => {

                    clearTimeout(interactionTimeout);

                    interactionTimeout = setTimeout(() => {

                        followUser = true;

                    }, 5000);
                }
            );

            console.log("✅ Map initialized");
        }

        // ============================
        // 📍 USER LOCATION
        // ============================
        updateMapLocation(lat, lon);

        // ============================
        // 🎯 RENDER DROPS
        // ============================
        renderDrops();

        // ============================
        // 🎯 RENDER SCOUTS
        // ============================
        renderScouts();

        // ============================
        // 🌊 ZONES
        // ============================
        drawDropZone();

        if (typeof drawScoutZone === "function") {
            drawScoutZone();
        }

        // ============================
        // 🔧 FIX MAP SIZE
        // ============================
        setTimeout(() => {

            if (mapInstance) {
                mapInstance.invalidateSize();
            }

        }, 250);

    }, 200);
}

// ============================
// 🎯 RENDER DROPS
// ============================
function renderDrops() {

    if (!mapInstance) return;

    // Clear old markers
    window.dropMarkers.forEach(marker => {

        try {
            mapInstance.removeLayer(marker);
        }

        catch (err) {
            console.warn("Drop remove failed", err);
        }
    });

    window.dropMarkers = [];

    // Draw fresh
    drops.forEach(drop => {

        if (
            drop.lat == null ||
            drop.lon == null
        ) return;

        const marker = L.marker(
            [drop.lat, drop.lon],
            { icon: dropIcon }
        )
        .addTo(mapInstance)
        .bindPopup(`🎯 SPI: ${drop.spi ?? "-" }%`);

        window.dropMarkers.push(marker);
    });
}

// ============================
// 🎯 RENDER SCOUTS
// ============================
function renderScouts() {

    if (!mapInstance) return;

    // Remove old
    window.scoutMarkers.forEach(marker => {

        try {
            mapInstance.removeLayer(marker);
        }

        catch (err) {
            console.warn("Scout remove failed", err);
        }
    });

    window.scoutMarkers = [];

    // Render new
    window.scouts.forEach((s, index) => {

        if (
            s.lat == null ||
            s.lon == null
        ) return;

        // Offset stops overlap
        const offsetLat =
            s.lat + ((index + 1) * 0.00002);

        const offsetLon =
            s.lon + ((index + 1) * 0.00002);

        const popup = `
        <b>🎯 Scout #${s.id ?? index + 1}</b><br><br>

        <b>SPI:</b> ${s.spi ?? "-"}%<br>
        <b>Pressure:</b> ${s.pressure ?? "-"} hPa<br>
        <b>Light:</b> ${s.light ?? "-"}%<br>
        <b>Depth:</b> ${s.depth ?? "-"} m<br>
        <b>Bottom:</b> ${s.bottom ?? "-"}°C<br><br>

        <b>Activity:</b> ${s.activity ?? "-"}<br>
        <b>Clarity:</b> ${s.clarity ?? "-"}<br>
        <b>Structure:</b> ${s.structure ?? "-"}<br>
        `;

        const marker = L.marker(
            [offsetLat, offsetLon],
            { icon: scoutIcon }
        )
        .addTo(mapInstance)
        .bindPopup(popup);

        marker.on("click", () => {

            selectedScout = s;

            if (
                typeof updateDashboardFromScout ===
                "function"
            ) {

                updateDashboardFromScout(s);
            }
        });

        window.scoutMarkers.push(marker);
    });
}

// ============================
// 🌊 BEST ZONE
// ============================
function drawDropZone() {

    if (!mapInstance) return;

    const zone = getBestZone();

    if (!zone) return;

    if (window.dropZoneCircle) {

        mapInstance.removeLayer(
            window.dropZoneCircle
        );
    }

    window.dropZoneCircle = L.circle(
        [zone.lat, zone.lon],
        {
            radius:
                zone.strength === "strong"
                    ? 80
                    : 50,

            color: "#28a745",
            fillColor: "#28a745",
            fillOpacity: 0.2,
            interactive: false
        }
    ).addTo(mapInstance);
}

// ============================
// ❌ CLOSE MAP
// ============================
function closeMap() {

    const screen =
        document.getElementById("mapScreen");

    if (screen) {
        screen.classList.add("hidden");
    }

    document.body.style.overflow = "auto"; }

// ============================
// 📍 UPDATE USER LOCATION
// ============================
function updateMapLocation(lat, lon) {

    // ============================
    // 🛡 SAFETY
    // ============================
    if (!mapInstance) {
        return;
    }

    if (
        lat == null ||
        lon == null ||
        isNaN(lat) ||
        isNaN(lon)
    ) {

        return;
    }

    // ============================
    // 🧭 FOLLOW USER
    // ============================
    const currentCenter =
        mapInstance.getCenter();

    const distance = mapInstance.distance(
        [currentCenter.lat, currentCenter.lng],
        [lat, lon]
    );

    if (distance > 50 && followUser) {

        mapInstance.panTo(
            [lat, lon],
            {
                animate: true
            }
        );
    }

    // ============================
    // 👤 USER MARKER
    // ============================
    if (!userMarker) {

        userMarker = L.marker(
            [lat, lon],
            { icon: userIcon }
        )
        .addTo(mapInstance)
        .bindPopup("You 🎯");

    }

    else {

        userMarker.setLatLng([lat, lon]);
    }
}


// =====================================================
// 🎯 UI HELPERS
// =====================================================

function updateSPI(v) {

    if (v == null || isNaN(v)) return;

    const arc = document.getElementById("spiArc");
    if (!arc) return;

    let color = GREEN;

    arc.style.stroke = color;

    const r = arc.r.baseVal.value;
    const C = 2 * Math.PI * r;

    arc.style.strokeDasharray = C;
    arc.style.strokeDashoffset = C - (v / 100) * C;

    const spiValue = document.getElementById("spiValue");

    if (spiValue) {
        spiValue.textContent = Math.round(v) + "%";
    }

    const gauge = document.getElementById("spiGauge");

    if (gauge) {
        gauge.style.filter =
            v >= 70
                ? "drop-shadow(0 0 12px rgba(0,255,156,0.35))"
                : "drop-shadow(0 0 6px rgba(0,255,156,0.15))";
    }
}

function estimateOxygen(temp, wind, cloud) {

    let oxygen =
        (14.6 - (temp * 0.4)) +
        (wind * 0.1) +
        (cloud * 0.02);

    return Math.max(5, Math.min(14, oxygen)); }

function refreshDashboard() {

    console.log("Manual refresh triggered");

    const icon = document.getElementById("refreshIcon");

    if (icon) {
        icon.style.animation = "spin 1s linear infinite";
    }

    fetchWeatherSafe();

    setTimeout(() => {
        if (icon) {
            icon.style.animation = "none";
        }
    }, 1500);
}

function toggleAI() {

    const panel = document.getElementById("aiPanel");
    const toggle = document.getElementById("aiToggle");

    if (!panel || !toggle) return;

    panel.classList.toggle("active");

    toggle.innerText =
        panel.classList.contains("active") ? "−" : "+";

    if (
        panel.classList.contains("active") &&
        typeof showInsight === "function"
    ) {
        showInsight(
            SPI,
            envScore,
            confScoreValue,
            ENV.light || 50,
            ENV.depth || 3
        );
    }
}

// =====================================================
// 🎣 SCOUT SYSTEM
// =====================================================

function setScout(type, value) {

    scoutData[type] = value;

    console.log("Scout:", scoutData);
}

function openScout() {

    const screen = document.getElementById("scoutScreen");

    if (!screen) return;

    screen.classList.remove("hidden");

    setTimeout(() => {
        setupScoutOptions();
    }, 50);
}

function setupScoutOptions() {

    const buttons = document.querySelectorAll(".opt");

    buttons.forEach(btn => {

        btn.onclick = function () {

            const type = this.dataset.type;
            let value = this.dataset.value;

            if (value === "slightly-stained") {
                value = "stained";
            }

            document
                .querySelectorAll(`.opt[data-type="${type}"]`)
                .forEach(el => el.classList.remove("active"));

            this.classList.add("active");

            scoutData[type] = value;

            console.log("Scout updated:", scoutData);
        };
    });
}

function clearScoutMarkers() {

    if (window.scoutMarkers) {

        window.scoutMarkers.forEach(marker => {
            try {
                marker.remove();
            } catch {}
        });
    }

    window.scoutMarkers = [];

    window.scouts = [];

    localStorage.removeItem("scouts");

    console.log("🧹 Scouts permanently cleaned"); }

function calculateScoutImpact(scout) {

    let score = 0;

    if (scout.activity === "none") score -= 15;
    if (scout.activity === "bubbles") score += 5;
    if (scout.activity === "rolling") score += 15;

    if (scout.clarity === "clear") score += 5;
    if (scout.clarity === "stained") score += 10;
    if (scout.clarity === "murky") score -= 5;

    if (scout.birds === "active") score += 10;

    if (scout.wind === "bank") score += 10;
    if (scout.wind === "calm") score -= 5;

    if (scout.structure === "weed") score += 5;
    if (scout.structure === "dropoff") score += 10;

    return Math.max(-20, Math.min(20, score)); }

function rankScoutSpots() {

    if (!window.scouts || window.scouts.length === 0) {
        return [];
    }

    const ranked = [...window.scouts]
        .sort((a, b) => (b.impact || 0) - (a.impact || 0));

    ranked.forEach((s, index) => {
        s.rodRank = index + 1;
    });

    return ranked.slice(0, 3);
}

async function continueScout() {

    const lat = userLocation?.lat ?? window.lastLat;
    const lon = userLocation?.lon ?? window.lastLon;

    if (lat == null || lon == null) {
        alert("⚠️ No GPS yet - move slightly and try again");
        return;
    }

    window.lastLat = lat;
    window.lastLon = lon;

    const newScout = {

        id: window.scouts.length + 1,

        time: Date.now(),

        lat,
        lon,

        spi: SPI,

        air: parseFloat(document.getElementById("airTemp")?.value) || null,

        pressure: parseFloat(document.getElementById("scoutPressure")?.value) || null,

        altitude: parseFloat(document.getElementById("altitude")?.value) || null,

        surface: parseFloat(document.getElementById("surfaceTemp")?.value) || null,

        bottom: parseFloat(document.getElementById("bottomTemp")?.value) || null,

        thermoStart: parseFloat(document.getElementById("thermoStart")?.value) || null,

        thermoEnd: parseFloat(document.getElementById("thermoEnd")?.value) || null,

        turbidity: parseFloat(document.getElementById("turbidity")?.value) || null,

        light: parseFloat(document.getElementById("scoutLight")?.value) || null,

        depth: parseFloat(document.getElementById("scoutDepth")?.value) || null,

        activity:
            document.querySelector('.opt.active[data-type="activity"]')
                ?.dataset.value ?? null,

        clarity:
            document.querySelector('.opt.active[data-type="clarity"]')
                ?.dataset.value ?? null,

        birds:
            document.querySelector('.opt.active[data-type="birds"]')
                ?.dataset.value ?? null,

        structure:
            document.querySelector('.opt.active[data-type="structure"]')
                ?.dataset.value ?? null,

        wind:
            document.querySelector('.opt.active[data-type="wind"]')
                ?.dataset.value ?? null
    };

    newScout.impact = calculateScoutImpact(newScout);

    window.scouts.push(newScout);

    localStorage.setItem(
        "scouts",
        JSON.stringify(window.scouts)
    );

    localStorage.setItem(
        "scoutLatest",
        JSON.stringify(newScout)
    );

    if (newScout.light != null) {
        ENV.light = newScout.light;
    }

    if (newScout.depth != null) {
        ENV.depth = newScout.depth;
    }

    closeScout();

    if (mapInstance && typeof drawScoutZone === "function") {
        drawScoutZone();
    }

    alert("✅ Scout saved successfully"); }

function closeScout() {

    document.body.style.overflow = "auto";

    const screen = document.getElementById("scoutScreen");

    if (!screen) return;

    screen.classList.add("hidden");

    screen.innerHTML = originalScoutHTML;

    setTimeout(() => {

        setupScoutOptions();

        if (typeof selectSource === "function") {
            selectSource(dataSource || "manual");
        }

    }, 50);
}

// =====================================================
// 📡 SENSOR / BLUETOOTH
// =====================================================

let dataSource = "manual";

function selectSource(type) {

    dataSource = type;

    document.querySelectorAll(".source-btn")
        .forEach(btn => btn.classList.remove("active"));

    document
        .querySelector(`[data-source="${type}"]`)
        ?.classList.add("active");

    const sensorBox =
        document.getElementById("sensorBox");

    if (sensorBox) {
        sensorBox.style.display =
            type === "sensor" ? "block" : "none";
    }
}

function checkSensors() {

    const list =
        document.getElementById("sensorStatusList");

    if (list) {
        list.innerHTML = "Connecting...";
    }

    return fetch("https://urldefense.com/v3/__http://192.168.1.160/data__;!!LtDMhTYuqQ!UK2eMS51J5_QFg3ARyavpW_lTRas5sFA2I1UL1yVIUPw2MnlwXibRxs_mqwVaSDUz_7Ty_yyCWqrhRxUwuuYZXJc$ ")
        .then(res => res.json())
        .then(data => {

            if (list) {

                list.innerHTML = `
                    <div>Temperature ${data.temp !== undefined ? "✅" : "❌"}</div>
                    <div>Pressure ${data.pressure !== undefined ? "✅" : "❌"}</div>
                    <div>Altitude ${data.altitude !== undefined ? "✅" : "❌"}</div>
                    <div>Light ${data.light !== undefined ? "✅" : "❌"}</div>
                    <div>Turbidity ${data.turbidity !== undefined ? "✅" : "❌"}</div>
                    <div>Depth ${data.depth !== undefined ? "✅" : "❌"}</div>
                `;
            }

            return true;
        })
        .catch(err => {

            console.error("FETCH ERROR:", err);

            if (list) {
                list.innerHTML = "❌ Connection failed";
            }

            return false;
        });
}

async function connectSensor() {

    try {

        const device =
            await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: [
                    "12345678-1234-1234-1234-1234567890ab"
                ]
            });

        const server = await device.gatt.connect();

        const service =
            await server.getPrimaryService(
                "12345678-1234-1234-1234-1234567890ab"
            );

        const characteristic =
            await service.getCharacteristic(
                "abcd1234-ab12-cd34-ef56-abcdef123456"
            );

        await characteristic.startNotifications();

        characteristic.addEventListener(
            "characteristicvaluechanged",
            event => {

                const value = event.target.value;

                const decoder =
                    new TextDecoder("utf-8");

                const jsonString =
                    decoder.decode(value);

                try {

                    const data =
                        JSON.parse(jsonString);

                    console.log("Sensor data:", data);

                    populateSensorData(data);

                } catch (e) {

                    console.error(
                        "JSON parse error:",
                        e
                    );
                }
            }
        );

        const sensorStatus =
            document.getElementById("sensorStatus");

        if (sensorStatus) {
            sensorStatus.innerText =
                "Connected ✅";
        }

    } catch (error) {

        console.error("Bluetooth error:", error);
    }
}

// =====================================================
// 📡 SENSOR CONNECT SCREEN
// =====================================================

function showConnectingScreen() {

    const screen =
        document.getElementById("scoutScreen");

    if (!screen) return;

    screen.innerHTML = `
    <div class="scout-card">

        <div class="scout-title">
            Connecting to AIF Sensor
        </div>

        <div class="sensor-list"
             id="sensorStatusList">

            Checking sensors...

        </div>

        <div class="scout-actions">

            <button
                onclick="retryConnection()"
                class="btn secondary">

                Retry

            </button>

            <button
                onclick="startScan()"
                class="btn primary">

                Start Scan

            </button>

        </div>

    </div>
    `;

    checkSensors();
}



// =====================================================
// 📡 START SENSOR SCAN
// =====================================================

function startScan() {

    const screen =
        document.getElementById("scoutScreen");

    if (!screen) return;

    screen.innerHTML = `
    <div class="scout-card">

        <div class="scout-title">
            Scanning...
        </div>

        <div class="scan-loader"></div>

        <div class="scan-text">

            Reading sensors...<br>
            Calculating SPI...<br>
            Analyzing conditions...

        </div>

    </div>
    `;

    setTimeout(() => {

        fetch("https://urldefense.com/v3/__http://192.168.1.160/data__;!!LtDMhTYuqQ!SgDP6bLbYcCjabwkU83T_THzmlS4__qn5u7kJJXDpA1eCxInPb7TejlqIFwbW2KPIz3jX9JDbuhyI2coTBuFqYYn$ ")

            .then(res => res.json())

            .then(data => {

                console.log(
                    "✅ Sensor data:",
                    data
                );

                populateSensorData(data);

                renderDashboard({
                    main: {
                        temp: data.air || 18,
                        pressure: data.pressure || 1015
                    },

                    wind: {
                        speed: 3,
                        deg: 180
                    },

                    clouds: {
                        all: 40
                    }
                });

                showResults(data);
            })

            .catch(err => {

                console.warn(
                    "Sensor scan failed:",
                    err
                );

                showScanFailed();
            });

    }, 1500);
}



// =====================================================
// ❌ SCAN FAILED
// =====================================================

function showScanFailed() {

    const screen =
        document.getElementById("scoutScreen");

    if (!screen) return;

    screen.innerHTML = `
    <div class="scout-card">

        <div class="scout-title">
            Scan Failed
        </div>

        <div class="error-text">
            ESP device not reachable
        </div>

        <div class="scout-actions">

            <button
                onclick="retryConnection()"
                class="btn secondary">

                Retry

            </button>

            <button
                onclick="closeScout()"
                class="btn primary">

                Exit

            </button>

        </div>

    </div>
    `;
}


function populateSensorData(data) {

    document.getElementById("airTemp").value =
        data.air || "";

    document.getElementById("scoutPressure").value =
        data.pressure || "";

    document.getElementById("altitude").value =
        data.altitude || "";

    document.getElementById("surfaceTemp").value =
        data.surface || "";

    document.getElementById("bottomTemp").value =
        data.bottom || "";

    document.getElementById("turbidity").value =
        data.turbidity || "";

    document.getElementById("scoutLight").value =
        data.light || "";

    document.getElementById("scoutDepth").value =
        data.depth || "";

    alert("Sensor data loaded ✅");
}

// =====================================================
// 🎯 DROP SYSTEM
// =====================================================

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

    localStorage.setItem(
        "drops",
        JSON.stringify(drops)
    );

    console.log("DROP SAVED:", drop);

    showDropFeedback();

    ripple();
}

function showDropFeedback() {

    const toast = document.createElement("div");

    toast.innerText =
        `🎯 Drop logged • SPI ${SPI.toFixed(1)}%`;

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

    document.body.appendChild(toast);

    setTimeout(() => {

        toast.style.opacity = "0";

        setTimeout(() => toast.remove(), 300);

    }, 1500);
}


// 🌊 REPORT

function openReport() {

    const screen = document.getElementById("reportScreen");

    if (!screen) return;

    screen.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    buildReport();
}

function closeReport() {

    const screen = document.getElementById("reportScreen");

    if (screen) {
        screen.classList.add("hidden");
    }

    document.body.style.overflow = "auto"; }

function buildReport() {

    const allDrops =
        Array.isArray(drops)
            ? drops
            : [];

    const allScouts =
        Array.isArray(window.scouts)
            ? window.scouts
            : [];

    // ============================
    // 📊 SUMMARY
    // ============================
    document.getElementById("repDrops").innerText =
        allDrops.length;

    const best =
        allDrops.length
            ? Math.max(...allDrops.map(d => d.spi || 0))
            : 0;

    document.getElementById("repBest").innerText =
        best.toFixed(1) + "%";

    const avg =
        allDrops.length
            ? (
                allDrops.reduce(
                    (s, d) => s + (d.spi || 0),
                    0
                ) / allDrops.length
            )
            : 0;

    document.getElementById("repAvg").innerText =
        avg.toFixed(1) + "%";

    document.getElementById("repScout").innerText =
        allScouts.length;

    // ============================
    // 🎣 TOP ROD PLAN
    // ============================
    const ranked =
        [...allScouts]
            .sort(
                (a, b) =>
                    (b.impact || 0)
                    -
                    (a.impact || 0)
            )
            .slice(0, 3);

    window.bestRodPlan = ranked;

    // ============================
    // 📦 BUILD UI
    // ============================
    buildDropLog();

    buildReportMap();
}

function buildDropLog() {

    let container =
        document.getElementById("dropLog");

    if (!container) return;

    container.innerHTML = "";

    // ============================
    // 🎣 TOP RODS
    // ============================
    if (
        window.bestRodPlan &&
        window.bestRodPlan.length
    ) {

        let rodCard =
            document.createElement("div");

        rodCard.className =
            "drop-card";

        rodCard.innerHTML = `
            <div class="drop-title">
                🎣 Recommended Rod Placement
            </div>

            ${
                window.bestRodPlan.map((s, i) => `

                    <div style="
                        margin-top:12px;
                        padding:10px;
                        border-radius:10px;
                        background:rgba(255,255,255,0.04);
                    ">

                        <b>
                            ${
                                i === 0
                                    ? "🥇 Rod 1"
                                    : i === 1
                                    ? "🥈 Rod 2"
                                    : "🥉 Rod 3"
                            }
                        </b>

                        <br>

                        Scout:
                        #${s.id || "-"}

                        <br>

                        📊 SPI:
                        ${s.spi || "-"}

                        <br>

                        🎯 Impact:
                        ${s.impact || 0}

                        <br>

                        🌡 Bottom:
                        ${s.bottom || "-"}°C

                        <br>

                        📏 Depth:
                        ${s.depth || "-"}m

                    </div>

                `).join("")
            }
        `;

        container.appendChild(rodCard);
    }

    // ============================
    // 📦 DROP HISTORY
    // ============================
    drops.forEach((d, i) => {

        let time =
            new Date(d.time)
                .toLocaleString();

        let el =
            document.createElement("div");

        el.className =
            "drop-card";

        el.innerHTML = `

            <div class="drop-title">
                🎯 Drop ${i + 1}
            </div>

            <div>🕒 ${time}</div>

            <div>
                📊 SPI:
                <b style="
                    color:${
                        d.spi >= 70
                            ? '#00ff9c'
                            : d.spi >= 50
                            ? '#ffaa00'
                            : '#ff5555'
                    };
                ">
                    ${d.spi ?? "-"}%
                </b>
            </div>

            <div>
                🌡 Surface:
                ${d.surface ?? "-"}°C
            </div>

            <div>
                🌊 Bottom:
                ${d.bottom ?? "-"}°C
            </div>

            <div>
                📏 Depth:
                ${d.depth ?? "-"}m
            </div>

            <div>
                🫧 Oxygen:
                ${d.oxygen ?? "-"}
            </div>

            <div>
                📍 ${
                    d.lat
                        ? d.lat.toFixed(5)
                        : "-"
                },
                ${
                    d.lon
                        ? d.lon.toFixed(5)
                        : "-"
                }
            </div>

        `;

        container.appendChild(el);
    });
}

let reportMapInstance;

function buildReportMap() {

    setTimeout(() => {

        // ============================
        // 🗺 INIT
        // ============================
        if (!reportMapInstance) {

            reportMapInstance =
                L.map('reportMap')
                    .setView(
                        [-26.2, 28.0],
                        13
                    );

            L.tileLayer(
                'https://urldefense.com/v3/__https://*7Bs*7D.tile.openstreetmap.org/*7Bz*7D/*7Bx*7D/*7By*7D.png__;JSUlJSUlJSU!!LtDMhTYuqQ!V-1JWzUPBl1gXZqblK2_M1s7D_JDtWvXYeukcWmddQdETzBZETA7B7sKIKahp8V3o2EReVoLapMaSC5dXF-eMKv2$ ',
                {
                    maxZoom: 19
                }
            ).addTo(reportMapInstance);
        }

        // ============================
        // 🧹 CLEAR OLD
        // ============================
        reportMapInstance.eachLayer(layer => {

            if (
                layer instanceof L.Marker ||
                layer instanceof L.Circle
            ) {
                reportMapInstance.removeLayer(layer);
            }

        });

        // ============================
        // 🌍 TILE LAYER
        // ============================
        L.tileLayer(
            'https://urldefense.com/v3/__https://*7Bs*7D.tile.openstreetmap.org/*7Bz*7D/*7Bx*7D/*7By*7D.png__;JSUlJSUlJSU!!LtDMhTYuqQ!V-1JWzUPBl1gXZqblK2_M1s7D_JDtWvXYeukcWmddQdETzBZETA7B7sKIKahp8V3o2EReVoLapMaSC5dXF-eMKv2$ ',
            {
                maxZoom: 19
            }
        ).addTo(reportMapInstance);

        // ============================
        // 🎯 DROP MARKERS
        // ============================
        drops.forEach((d, i) => {

            if (!d.lat || !d.lon) return;

            L.marker([d.lat, d.lon])
                .addTo(reportMapInstance)
                .bindPopup(`

                    <b>🎯 Drop ${i + 1}</b>

                    <br><br>

                    📊 SPI:
                    ${d.spi ?? "-"}

                    <br>

                    🌡 Surface:
                    ${d.surface ?? "-"}

                    °C

                    <br>

                    🌊 Bottom:
                    ${d.bottom ?? "-"}

                    °C

                    <br>

                    📏 Depth:
                    ${d.depth ?? "-"}

                    m

                    <br>

                    🫧 Oxygen:
                    ${d.oxygen ?? "-"}

                `);

        });

        // ============================
        // 🎣 ROD ZONES
        // ============================
        if (window.bestRodPlan) {

            window.bestRodPlan.forEach((s, i) => {

                if (!s.lat || !s.lon) return;

                L.circle(
                    [s.lat, s.lon],
                    {
                        radius:
                            i === 0
                                ? 60
                                : i === 1
                                ? 45
                                : 30,

                        color:
                            i === 0
                                ? "#00ff9c"
                                : i === 1
                                ? "#ffaa00"
                                : "#66ccff",

                        fillOpacity: 0.20
                    }

                ).addTo(reportMapInstance);

            });
        }

        // ============================
        // 🎯 BEST DROP ZONE
        // ============================
        const zone =
            getBestZone();

        if (zone) {

            L.circle(
                [zone.lat, zone.lon],
                {
                    radius:
                        zone.strength === "strong"
                            ? 80
                            : 50,

                    color: "#00ffaa",
                    fillColor: "#00ffaa",
                    fillOpacity: 0.15
                }

            ).addTo(reportMapInstance);
        }

        // ============================
        // 🔧 FIX SIZE
        // ============================
        setTimeout(() => {

            reportMapInstance.invalidateSize();

        }, 250);

    }, 300);
}

// =====================================================
// 🎯 BEST FISHING ZONE (SCOUTS)
// =====================================================
function getBestScoutZone() {

    if (!scouts || scouts.length === 0) {
        return null;
    }

    const goodScouts =
        scouts.filter(
            s => s.lat && s.lon
        );

    if (!goodScouts.length) {
        return null;
    }

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
        strength:
            goodScouts.length >= 3
                ? "strong"
                : "normal",

        count: goodScouts.length
    };
}

function drawScoutZone() {

    const zone =
        getBestScoutZone();

    if (!zone || !mapInstance) {
        return;
    }

    if (window.scoutZoneCircle) {
        mapInstance.removeLayer(
            window.scoutZoneCircle
        );
    }

    window.scoutZoneCircle =
        L.circle(
            [zone.lat, zone.lon],
            {
                radius:
                    zone.strength === "strong"
                        ? 50
                        : 30,

                color: "#00ff88",
                fillOpacity: 0.25
            }

        ).addTo(mapInstance);
}

// =====================================================
// 🎯 BEST DROP ZONE
// =====================================================
function getBestZone() {

    if (!drops || drops.length === 0) {
        return null;
    }

    const goodDrops =
        drops.filter(
            d =>
                d.spi >= 65 &&
                d.lat &&
                d.lon
        );

    if (!goodDrops.length) {
        return null;
    }

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

        strength:
            goodDrops.length >= 3
                ? "strong"
                : "normal",

        count: goodDrops.length
    };
}

// =====================================================
// 🎯 SPI DIRECTION ZONE
// =====================================================
function setFishingZone(targetAngle) {

    const ticks =
        document.querySelectorAll(".tick");

    if (!ticks.length) return;

    const zoneData =
        getBestZone();

    const zoneStrength =
        zoneData?.strength || "normal";

    ticks.forEach(tick => {

        const angle =
            parseInt(
                tick.dataset.angle
            );

        let diff =
            Math.abs(
                angle - targetAngle
            );

        if (diff > 180) {
            diff = 360 - diff;
        }

        const zoneWidth =
            zoneStrength === "strong"
                ? 55
                : 40;

        tick.classList.remove(
            "active-zone",
            "active-zone-strong"
        );

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
    type: "",
    avgDepth: 0,
    clarity: "",
    structure: [],
    notes: ""
};

function saveDamData(data) {

    localStorage.setItem(
        "damData",
        JSON.stringify(data)
    );
}

function loadDamData() {

    return JSON.parse(
        localStorage.getItem("damData")
    ) || {};
}

function openDam() {

    let screen =
        document.getElementById("damScreen");

    if (!screen) return;

    screen.classList.remove("hidden");

    document.body.style.overflow =
        "hidden";

    screen.innerHTML = `
        <div class="scout-card">

            <div class="scout-title">
                Dam Setup
            </div>

            <input
                placeholder="Dam Name"
                id="damName"
            >

            <select id="damType">
                <option value="dam">Dam</option>
                <option value="lake">Lake</option>
                <option value="river">River</option>
            </select>

            <input
                placeholder="Avg Depth (m)"
                id="damDepth"
            >

            <select id="damClarity">
                <option value="clear">Clear</option>
                <option value="stained">Stained</option>
                <option value="murky">Murky</option>
            </select>

            <div class="scout-actions">

                <button
                    onclick="saveDam()"
                    class="btn primary"
                >
                    Save
                </button>

                <button
                    onclick="closeDam()"
                    class="btn secondary"
                >
                    Close
                </button>

            </div>

        </div>
    `;
}

function saveDam() {

    let data = {

        name:
            document.getElementById("damName").value,

        type:
            document.getElementById("damType").value,

        avgDepth:
            parseFloat(
                document.getElementById("damDepth").value
            ),

        clarity:
            document.getElementById("damClarity").value
    };

    localStorage.setItem(
        "damData",
        JSON.stringify(data)
    );

    alert("Dam saved ✔");
}

function closeDam() {

    let screen =
        document.getElementById("damScreen");

    if (screen) {
        screen.classList.add("hidden");
    }

    document.body.style.overflow =
        "auto";
}

// 🌊 PLAN
function openPlan() {

    let dam =
        loadDamData();

    let plan = [];

    if (SPI > 70) {
        plan.push(
            "Fish shallow windward bank"
        );
    }

    else if (SPI > 50) {
        plan.push(
            "Target mid-depth transitions"
        );
    }

    else {
        plan.push(
            "Focus deeper structure"
        );
    }

    if (dam.avgDepth > 5) {
        plan.push(
            "Look for drop-offs"
        );
    }

    if (dam.clarity === "clear") {
        plan.push(
            "Use natural bait, fish cautious"
        );
    }

    document.getElementById("planScreen").innerHTML = `
        <div class="scout-card">

            <div class="scout-title">
                Fishing Plan 🎯
            </div>

            <div>
                ${plan.join("<br>")}
            </div>

            <button
                onclick="closePlan()"
                class="btn primary"
            >
                Close
            </button>

        </div>
    `;

    document.getElementById("planScreen")
        .classList.remove("hidden");
}

function closePlan() {

    let screen =
        document.getElementById("planScreen");

    if (screen) {
        screen.classList.add("hidden");
    }

    document.body.style.overflow =
        "auto";
}

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const svg =
            document.getElementById("spiGauge");

        if (!svg) return;

        for (
            let i = 0;
            i < 360;
            i += 15
        ) {

            const line =
                document.createElementNS(
                    "https://urldefense.com/v3/__http://www.w3.org/2000/svg__;!!LtDMhTYuqQ!V-1JWzUPBl1gXZqblK2_M1s7D_JDtWvXYeukcWmddQdETzBZETA7B7sKIKahp8V3o2EReVoLapMaSC5dXNfXw30s$ ",
                    "line"
                );

            line.setAttribute("x1", "150");
            line.setAttribute("y1", "15");
            line.setAttribute("x2", "150");
            line.setAttribute("y2", "30");

            line.setAttribute(
                "stroke",
                "white"
            );

            line.setAttribute(
                "stroke-width",
                (
                    i % 90 === 0
                        ? 3
                        : 1
                ).toString()
            );

            line.setAttribute(
                "opacity",
                "0.3"
            );

            line.setAttribute(
                "transform",
                "rotate(" + i + " 150 150)"
            );

            svg.appendChild(line);
        }
    }
);

function showInsight(
    SPI,
    env,
    conf,
    light,
    depth
) {

    const el =
        document.getElementById("aiContent");

    if (!el) return;

    let tips = [];

    if (!SPI || SPI === 0) {

        el.innerHTML =
            "Loading conditions....";

        return;
    }

    // 🎯 SPI
    if (SPI > 75) {

        tips.push(
            "🔥 High feeding activity expected"
        );

        tips.push(
            "🎯 Fish windward banks"
        );

        tips.push(
            "🍬 Use high-attract bait"
        );
    }

    else if (SPI > 55) {

        tips.push(
            "👍 Moderate activity"
        );

        tips.push(
            "📍 Focus transition zones"
        );

        tips.push(
            "🎣 Balanced baiting strategy"
        );
    }

    else {

        tips.push(
            "⚠️ Low activity"
        );

        tips.push(
            "🔍 Search deeper structure"
        );

        tips.push(
            "🧪 Use single hookbait"
        );
    }

    // 🌞 LIGHT
    if (light > 70) {

        tips.push(
            "🌞 Bright — fish deeper or shaded areas"
        );

    } else {

        tips.push(
            "🌅 Low light — fish shallow margins"
        );
    }

    // 🌊 DEPTH
    if (
        depth >= 2 &&
        depth <= 5
    ) {

        tips.push(
            "📏 Ideal depth — patrol routes active"
        );
    }

    // 🧠 CONF
    if (conf > 80) {

        tips.push(
            "🧠 Stay consistent — pattern is reliable"
        );

    } else {

        tips.push(
            "🧠 Be ready to adapt"
        );
    }

    el.innerHTML =
        tips.map(
            t =>
                `<div class="ai-tip">${t}</div>`
        ).join("");
}

// ============================
// 🗑 CLEAR MAP SCOUTS
// ============================
document.getElementById("clearMapBtn")
?.addEventListener(
    "click",
    () => {

        if (!window.scoutMarkers) {
            return;
        }

        window.scoutMarkers.forEach(
            m => mapInstance.removeLayer(m)
        );

        window.scoutMarkers = [];

        console.log(
            "Map cleared (visual only)"
        );
    }
);

// ============================
// ❌ CLOSE MAP
// ============================
document.getElementById("closeMapBtn")
?.addEventListener(
    "click",
    () => {
        closeMap();
    }
);

window.retryConnection =
    retryConnection;

window.startScan =
    startScan;

window.closeScout =
    closeScout;
