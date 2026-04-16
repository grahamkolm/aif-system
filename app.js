// =====================================================
// 🌍 0. GLOBAL BASE (CLEAN STRUCTURE)
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

// ============================
// 🎨 END OF GLOBALS
// ============================


let originalScoutHTML = "";

function storeScoutScreen() {
    const el = document.getElementById("scoutScreen");
    if (!el) {
        console.warn("scoutScreen not found");
        return;
    }

    originalScoutHTML = el.innerHTML;
    el.classList.add("hidden");
}

function createTicks() {

  const container = document.getElementById("compassTicks");

  if (!container) {
    console.error("❌ tickContainer not found");
    return;
  }

  const step = 5;

  for (let i = 0; i < 360; i += step) {

    let angle = i;

    const tick = document.createElement("div");
    tick.className = "tick";

    if (i % 90 === 0) {
      tick.classList.add("tick-major");
    } else if (i % 15 === 0) {
      tick.classList.add("tick-medium");
    } else {
      tick.classList.add("tick-small");
    }

    tick.dataset.angle = angle;

    tick.style.transform =
      `translate(-50%, -50%) rotate(${angle}deg) translateY(-125px)`;

    container.appendChild(tick);
  }
}

// =====================================================
// 🚀 1. APP BOOT
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

    // =============================
    // 🌊 SPLASH INIT
    // =============================
    splashCanvas = document.getElementById("splashCanvas");
    splashCtx = splashCanvas?.getContext("2d");

    resizeSplash();

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
    createTicks();
    positionDirections();
    storeScoutScreen();
    
    // =============================
    // 🎯 UI SETUP
    // =============================
    
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

    function showENVInsight() {
    alert("ENV Insight coming soon..."); 
    }

    function showCONFInsight() {
    alert("Confidence Insight coming soon..."); 
    }

    setupHold("envScore", showENVInsight);
    setupHold("confScore", showCONFInsight);
    
        // =============================
    // ⏳ SPLASH TIMEOUT (MAIN CONTROL)
    // =============================
    setTimeout(() => {

        splashActive = false;

        const splash = document.getElementById("splash");
        const main = document.querySelector(".main");

        // Fade out splash
        if (splash) splash.style.opacity = "0";

        // Wait for fade animation
        setTimeout(() => {

            if (splash) splash.style.display = "none";
            if (main) main.classList.add("main-visible");
            
            // =============================
            // 🚀 START APP (ONLY AFTER SPLASH)
            // =============================
            fetchWeatherSafe();
            startApp();

            canvas = document.getElementById("waterGraph");
            ctx = canvas ? canvas.getContext("2d") : null;

            // 🔁 KEEP UPDATING
            setInterval(fetchWeatherSafe, 30000);

        }, 400); // match CSS transition

    }, 2500); // splash duration

});

function updateDirectionTicks(heading) {

    const ticks = document.querySelectorAll(".tick");

    ticks.forEach(tick => {
        const angle = parseInt(tick.dataset.angle);

        let diff = Math.abs(angle - heading);
        if (diff > 180) diff = 360 - diff;

        if (diff < 10) {
            tick.classList.add("active-direction");
        } else {
            tick.classList.remove("active-direction");
        }
    });
}

function positionDirections() {
  const radius = 170; // bigger than your ticks (~125)

  setDir(".dir.n", 0);
  setDir(".dir.e", 90);
  setDir(".dir.s", 180);
  setDir(".dir.w", 270);

  function setDir(selector, angle) {
    const el = document.querySelector(selector);
    if (!el) return;

    el.style.transform =
      `translate(-50%, -50%) rotate(${angle}deg) translateY(-${radius}px) rotate(-${angle}deg)`;
  }
}

// =====================================================
// 💧 2. SPLASH SYSTEM
// =====================================================

let splashRipples = [];

function resizeSplash() {
    if (!splashCanvas) return;
    splashCanvas.width = window.innerWidth;
    splashCanvas.height = window.innerHeight;
} 
window.addEventListener("resize", resizeSplash); 
resizeSplash();

function createSplashRipple() {
    splashRipples.push({
        x: Math.random() * splashCanvas.width,
        y: Math.random() * splashCanvas.height,
        r: 0,
        alpha: 0.5
    });
}

function initSplashBubbles() {
  bubbles = [];

  for (let i = 0; i < 40; i++) {
    bubbles.push({
      x: Math.random() * splashCanvas.width,
      y: Math.random() * splashCanvas.height,
      r: Math.random() * 3 + 1,
      speed: Math.random() * 0.5 + 0.2
    });
  }
}

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

                    console.log("✅ Compass enabled");

                    window.addEventListener("deviceorientation", e => {

                        if (e.alpha !== null) {
                            compassHeading = 360 - e.alpha;
                        }

                    });

                } else {
                    console.log("❌ Permission denied");
                }

            })
            .catch(console.error);

    } else {

        // Android
        window.addEventListener("deviceorientation", e => {

            if (e.alpha !== null) {
                compassHeading = 360 - e.alpha;
            }

        });

        console.log("✅ Compass auto-enabled");
    }
}

//--------------------------------------------------
// TACTICAL BAR (FINAL DESIGN)
//--------------------------------------------------

function getConditionText(SPI, envScore) {

  let score = (SPI + envScore) / 2;

  if (score > 85) return "🔥 Conditions are excellent — fish should feed";
  if (score > 70) return "👍 Conditions are good — fish active";
  if (score > 55) return "👌 Conditions are fair — some movement";
  if (score > 40) return "⚠️ Conditions are slow — bites limited";

  return "❄️ Tough conditions — very quiet";
}


function getZoneText(SPI, light, depth, wind) {

  if (SPI > 75 && wind > 5) return "📍 Focus shallow windward zones";
  if (light > 70) return "📍 Fish deeper cooler water";
  if (depth >= 2 && depth <= 5) return "📍 Target mid-depth transitions";

  return "📍 Search structure and edges";
}


function getConfidenceText(SPI, confScore) {

  if (SPI > 75 && confScore > 75)
    return "🧠 Stay on your spots — be patient";

  if (SPI > 60)
    return "🧠 Give it time before changing";

  if (SPI < 50)
    return "🧠 Consider changing approach";

  return "🧠 Monitor and adjust if needed";
}


function getXFactor(SPI, prevSPI) {

  if (!prevSPI) return null;

  let diff = SPI - prevSPI;

  if (diff > 8) return "⚡ Conditions improving — get ready";
  if (SPI > 85) return "🚀 Prime feeding window now";

  return null;
}

function updateTacticalBar(SPI, envScore, confScore, ENV, prevSPI, forecastData) {

  const lines = [
    getConditionText(SPI, envScore),
    getZoneText(SPI, ENV.light, ENV.depth, ENV.wind),
    getConfidenceText(SPI, confScore)
  ];

  // 🔥 ADD THIS BLOCK
  const window = getStableWindow(forecastData);
  console.log("Window Debug:", window);
    const windowText = getWindowText(window);

 if (windowText) {

  // 🔥 Boost when SPI is strong
  if (SPI > 80) {
    lines.splice(1, 0, "🔥 " + windowText);
  } else {
    lines.splice(1, 0, windowText);
  }
}


  const extra = getXFactor(SPI, prevSPI);

  if (extra) lines.push(extra);

  document.getElementById("tactical").innerText = lines.join("\n"); }


//--------------------------------------------------
//LOCKING SYSTEM (VERY IMPORTANT)
//--------------------------------------------------

function getBestFishingWindow(forecastData) {

  // 🛑 SAFETY CHECK
  if (!forecastData || forecastData.length < 3) {
    return null;
  }

  let bestScore = 0;
  let bestWindow = null;

  for (let i = 0; i < forecastData.length - 2; i++) {

    let avg =
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

  const stored = localStorage.getItem("bestWindow");

  // ✅ Only use stored if it's a REAL array
  if (stored) {
    try {
      const parsed = JSON.parse(stored);

      if (Array.isArray(parsed) && parsed.length === 2) {
        return parsed;
      }
    } catch (e) {
      console.warn("Bad stored window, recalculating...");
    }
  }

  const window = getBestFishingWindow(forecastData);

  if (window) {
    localStorage.setItem("bestWindow", JSON.stringify(window));
  }

  return window;
}


//--------------------------------------------------
// BEST FISHING WINDOW
//--------------------------------------------------

function getWindowText(window) {

  if (!window) return "No window yet";

  // 👉 Get today's date (e.g. "16 Apr")
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short"
  }).replace(",", "");

  // 👉 Check if today is inside the window
  if (today === window[0] || today === window[1]) {
    return "🚨 Window is OPEN — fish NOW";
  }

  return `🎯 Best fishing window: ${window[0]} → ${window[1]}`; 
}


// =====================================================
// 🧭 COMPASS UI UPDATE 
// =====================================================

function updateCompass(heading) {

    if (heading == null) return;

    // Rotate compass ring (if exists)
    const compass = document.getElementById("compassRing");
    if (compass) {
        compass.style.transform = `rotate(${-heading}deg)`;
    }

    // Update active tick (direction highlight)
    updateDirectionTicks(heading);

    // Optional: set fishing zone based on wind vs heading
    if (typeof windDir !== "undefined") {
        setFishingZone(windDir);
    }
}

    // Compass
    document.addEventListener("DOMContentLoaded", () => {
        
    document.body.addEventListener("touchstart", enableCompass, { once: true }); 
    document.body.addEventListener("click", enableCompass, { once: true });
    });

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

  b.y -= b.speed;
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
// 🚀 3. MAIN APP
// =====================================================

function ripple() {
    ripples.push({
        r: 0,
        alpha: 0.3,
        x: canvas.width / 2,
        y: canvas.height * 0.7
    });
}


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
   
    setTimeout(() => {
    //    setupHold("Gauge", showSPIInsight);
    }, 1500);
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
// 🌊 4. VISUAL ENGINE
// =====================================================

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
    updateDirectionTicks(compassHeading || 0 );
    
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
}).catch(() => {
    console.warn("Using simulated weather");

    setTimeout(() => {
        if (typeof renderDashboard === "function") {
            renderDashboard({
                main: { temp: 22, pressure: 1018 },
                wind: { speed: 3, deg: 180 },
                clouds: { all: 40 }
            });
        } else {
            console.error("renderDashboard STILL not available");
        }
    }, 500); // ⬅️ longer delay
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
// 📊 6. SPI ENGINE (UNIFIED)
// =====================================================

function calculateSPI(p, w, c, windDir, t, light, depth){

    let score = 0;
    let reasons = [];

    // ================= PRESSURE =================
    let pressureScore = 0;
    let trend = getPressureTrend(p);

    if (p >= 1012 && p <= 1020) pressureScore = 15;
    else if (p >= 1008 && p <= 1024) pressureScore = 10;
    else pressureScore = 5;

    if (trend === "rising") pressureScore += 5;
    if (trend === "falling") pressureScore -= 5;

    score += pressureScore;

    // ================= COMBINATION BOOST =================

    // Wind + Cloud synergy (VERY powerful)
    if (w >= 5 && w <= 15 && c >= 30 && c <= 70) {
    score += 10;
    reasons.push("Wind + cloud combo → aggressive feeding"); 
    }

    // Pressure + Temp stability
    if (p > 1015 && t >= 18 && t <= 24) {
    score += 8;
    reasons.push("Stable pressure + temp → consistent feeding"); 
    }

    // Bad combo penalty
    if (w < 2 && c < 20) {
    score -= 10;
    reasons.push("Flat calm + bright → fish inactive"); 
    }
   
    // ================= WIND =================
    let windScore = 0;

    if (w >= 5 && w <= 15) windScore = 20;
    else if (w >= 3 && w < 5) windScore = 10;
    else if (w > 15) windScore = 5;
    else windScore = 0;

    score += windScore;

// ================= WIND DIRECTION ================= 
    if (diff !== undefined) {
    if (diff > 135) {
        score += 10;
        reasons.push("Wind blowing into zone (prime feeding)");
    } else if (diff < 45) {
        score -= 8;
        reasons.push("Downwind zone (low activity)");
    }
    }
    
    // ================= CLOUD =================
    let cloudScore = 0;

    if (c >= 30 && c <= 70) cloudScore = 15;
    else if (c > 70) cloudScore = 10;
    else cloudScore = 5;

    score += cloudScore;

    // ================= TEMP =================
    let tempScore = 0;

    if (t >= 18 && t <= 24) tempScore = 25;
    else if (t >= 15 && t < 18) tempScore = 15;
    else if (t > 24 && t <= 28) tempScore = 10;
    else tempScore = 5;

    score += tempScore;

    // ================= LIGHT =================
    if (light >= 40 && light <= 70) {
    score += 8;
    reasons.push("Optimal light penetration"); 
    } else if (light < 20) {
    score -= 5;
    reasons.push("Too dark — reduced visibility"); 
    } else {
    score -= 3;
    reasons.push("Too bright — fish cautious"); 
    }

    // ================= DEPTH =================
    if (depth >= 2 && depth <= 5) {
    score += 10;
    reasons.push("Ideal feeding depth"); 
    } else if (depth < 1) {
    score -= 6;
    reasons.push("Too shallow");
    } else if (depth > 8) {
    score -= 4;
    reasons.push("Too deep for active feeding"); 
}

// ================= TIME WINDOWS =================
    score += sunriseWindow() * 0.5;
    score += seasonalWeight() * 0.5;

// ================= FINAL NORMALIZE ===============

// Amplify extremes
    if (score > 75) score += 5;
    if (score < 40) score -= 5;

    score = Math.max(15, Math.min(98, score));

    return {
        score: Math.round(score),
        reasons: reasons
    };
}

function applyScoutImpact(spi) {

    let bonus = 0;

    if (scoutData.activity === "bubbles") bonus += 10;
    if (scoutData.activity === "rolling") bonus += 15;

    if (scoutData.wind === "windblown") bonus += 8;
    if (scoutData.wind === "calm") bonus -= 5;

    return Math.max(0, Math.min(100, spi + bonus)); }

function calculateAverageSPI() {
    if (drops.length === 0) return 0;

    let total = drops.reduce((sum, d) => sum + d.spi, 0);
    return (total / drops.length).toFixed(1); }


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
  applyTileColor("lightTile", getLightStatus(data.cloud, data.time)); }


// =====================================================
// 🌬️ AIR TEMP
// =====================================================
function getAirStatus(temp) {
  if (temp >= 15 && temp <= 24) return "green";
  if (temp >= 10 && temp <= 28) return "orange";
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
// 📊 7. DASHBOARD
// =====================================================

function renderDashboard(data) {
    console.log("Dashboard render placeholder");
    lastConditions = data;
    const t = data.main.temp;
    const p = data.main.pressure;
    const w = data.wind.speed * 3.6;
    const c = data.clouds.all;
    windDir = data.wind?.deg || 0;
    diff = 0;
    initGPS();

    if (typeof compassHeading !== "undefined" &&compassHeading !== null) {
        diff = Math.abs(windDir - compassHeading);
        if(diff > 180) diff = 360 - diff;
    }
    console.log("Wind vs heading off:", diff);

    let advice = getCastingAdvice(diff);
    console.log("Casting:", advice);

    const light = data.light || 50;
    const depth = data.depth || 3;
    
    let temps = calculateWaterTemps(data.main.temp);
    if (tempModel.source === "sensor") {
    temps = tempModel;
    }
    let surfaceTemp = temps.surface;
    let bottomTemp = temps.bottom;
    
    updateCompass(windDir);
    setFishingZone(windDir);
    let dam = loadDamData();

    console.log("SPI INPUT:", t, p, w, c);
    
    let result = calculateSPI(p, w, c, windDir, t, light, depth); 
    let newSPI = result.score;

    // smoothing
    if (lastSPI !== null) {
        newSPI = Math.round((newSPI * 0.7) + (lastSPI * 0.3));
    }
    
    newSPI = applyScoutImpact(newSPI);
    
    let finalSPI = newSPI;
    
    console.log("base SPI:", newSPI);
    console.log("Final SPI:", finalSPI);
    
    lastSPI = finalSPI;
    SPI = finalSPI;
    
  let scoutBonus = newSPI - result.score;

    let scoutEl = document.getElementById("scoutBonus");
    if (scoutEl) {
    scoutEl.innerText = scoutBonus >= 0
        ? `+${scoutBonus} Scout`
        : `${scoutBonus} Scout`;
}
   
    let tempAnalysis = analyzeTemperature(t,surfaceTemp,bottomTemp);
       
    let status = document.getElementById("tactical");
    if (status) status.innerText = "Updating...";
    
    let combineReasons = [
        ...(result.reasons || []),
        ...(tempAnalysis.insights || [])
    ];
    
    let msg = document.querySelector(".status-text");
    if (msg) msg.innerText = "Conditions optimal";
    
    // =========================
    // ✅ UPDATE RINGS 
    // =========================
    updateSPI(finalSPI);

    // =========================
    // ✅ VISUAL LINK (important)
    // =========================
    bubbleIntensity = finalSPI / 100;
    document.getElementById("feed").innerText = feeding(finalSPI);

    // ================= OXYGEN =================
        let oxygen = estimateOxygen(t, w, c);

    document.getElementById("oxygen").innerText =
        oxygen.toFixed(1) + " mg/L";

    setIcon("droplets", oxygen, [
        { min: 9, max: 20, color: GREEN },
        { min: 7, max: 8.9, color: ORANGE },
        { min: 0, max: 6.9, color: RED }
    ]);
    
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

    // ================= HELPER FUNCTION =================

let lightEl = document.getElementById("light");
    if (lightEl) lightEl.innerText = light + "%"; 
let depthEl = document.getElementById("depth");
    if(depthEl) depthEl.innerText = depth.toFixed(1) + " m";

    function setIcon(iconName, value, rules) {
        let icon = document.querySelector(`[data-lucide="${iconName}"]`);
        if (!icon) return;

        for (let r of rules) {
            if (value >= r.min && value <= r.max) {
                icon.style.stroke = r.color;
                return;
            }
        }

        icon.style.stroke = GREEN;
    }

    // ================= AIR =================
    document.getElementById("air").innerText = t.toFixed(1) + "°C";

    setIcon("sun", t, [
        { min: 30, max: 100, color: RED },
        { min: 25, max: 29, color: ORANGE }
    ]);

    // ================= SURFACE =================
    document.getElementById("surface").innerText = surfaceTemp.toFixed(1) + "°C";

    setIcon("waves", surfaceTemp, [
        { min: 30, max: 100, color: RED },
        { min: 22, max: 29, color: ORANGE }
    ]);

    // ================= BOTTOM =================
    document.getElementById("bottom").innerText = bottomTemp.toFixed(1) + "°C";

    setIcon("arrow-down", bottomTemp, [
        { min: 28, max: 100, color: RED },
        { min: 20, max: 27, color: ORANGE }
    ]);

    // ================= PRESSURE =================
    document.getElementById("pressure").innerText = p + " hPa";

    setIcon("gauge", p, [
        { min: 1022, max: 1100, color: ORANGE },
        { min: 0, max: 1005, color: RED }
    ]);

    // ================= WIND =================
    document.getElementById("wind").innerText = w.toFixed(1) + " km/h";

    setIcon("wind", w, [
        { min: 20, max: 100, color: RED },
        { min: 12, max: 19, color: ORANGE }
    ]);

    function getWindDirectionText(deg){
    if (deg >= 45 && deg < 135) return "Wind → East bank";
    if (deg >= 135 && deg < 225) return "Wind → South bank";
    if (deg >= 225 && deg < 315) return "Wind → West bank";
    return "Wind → North bank";
}

    // ================= CLOUD =================
    document.getElementById("cloud").innerText = c + "%";

    setIcon("cloud", c, [
        { min: 80, max: 100, color: RED },
        { min: 40, max: 79, color: ORANGE }
    ]);

    // ================= MOON =================
    document.getElementById("moon").innerText = getMoonPhase();
    setIcon("moon", 1, [{ min: 0, max: 10, color: "#8fb3ff" }]);

    // ================= SEASON =================
    document.getElementById("season").innerText = getSeason();
    setIcon("leaf", 1, [{ min: 0, max: 10, color: GREEN }]);



    // ================= FEED =================
    document.getElementById("feed").innerText = feeding(SPI);

    setIcon("fish", SPI, [
        { min: 70, max: 100, color: GREEN },
        { min: 50, max: 69, color: ORANGE },
        { min: 0, max: 49, color: RED }
    ]);

   
    function getScoreColor(value) {
    if (value >= 80) return "#00ff9c";   // green
    if (value >= 60) return "#ffd700";   // yellow
    return "#ff4d4d";                    // red
}


    
// ================= ENV + CONF =================
// ================= ENV ================= 
envScore = calculateENV(p, c, w, light, t);

let envEl = document.getElementById("envScore");
if (envEl) envEl.innerText = envScore + "%";
   
// ================= CONF =================    
function calculateCONF(SPI, envScore, p, w, c, t) {

    let score = 50;

    let alignment = Math.abs(SPI - envScore);

    if (alignment < 10) score += 20;
    else if (alignment < 20) score += 10;
    else score -= 10;

    let trend = getPressureTrend(p);

    if (trend === "stable") score += 10;
    if (trend === "rising") score += 5;
    if (trend === "falling") score -= 10;

    if (w >= 5 && w <= 15) score += 8;
    else if (w < 2 || w > 20) score -= 8;

    if (c >= 30 && c <= 70) score += 6;
    else if (c > 90 || c < 10) score -= 6;

    if (t >= 18 && t <= 24) score += 10;
    else if (t < 12 || t > 30) score -= 10;

    let variability = Math.abs(SPI - (lastSPI !== undefined ? lastSPI : SPI));

    if (variability < 5) score += 10;
    else if (variability > 15) score -= 10;

    if (SPI > 80 && envScore > 80) score += 5;
    if (SPI < 40 && envScore < 40) score += 5;

    if (isNaN(score)) score = 50;

    return Math.max(40, Math.min(95, Math.round(score))); }


confScoreValue = calculateCONF(SPI, envScore, p, w, c, t);

const ENVdata = {
    light: light, 
    depth: depth,
    wind: w
};

const forecastData = [
        {date: "16 Apr", spi: 65},
        {date: "17 Apr", spi: 78},
        {date: "18 Apr", spi: 88},
        {date: "19 Apr", spi: 82},
        {date: "20 Apr", spi: 70}
];
console.log("Forecast check", forecastData);    
updateTacticalBar(
    SPI,
    envScore,
    confScoreValue, 
    ENVdata,
    lastSPI,
    forecastData
    );

let confEl = document.getElementById("confScore");
if (confEl) {
    confEl.innerText = confScoreValue + "%"; }


// 🎯 GET ELEMENTS (ONLY ONCE)
const spiCircle = document.getElementById("spiCircle");
const envCircle = document.getElementById("envCircle");
const confCircle = document.getElementById("confCircle");

// 🎨 COLORS (ONLY ONCE)
const spiColor = getScoreColor(finalSPI); 
const envColor = getScoreColor(envScore); 
const confColor = getScoreColor(confScoreValue);
    
// ✅ APPLY COLORS
// ✅ TEXT COLORS
const spiText = document.getElementById("spiValue");
const envText = document.getElementById("envScore");
const confText = document.getElementById("confScore");

if (spiText) spiText.style.color = spiColor; 
if (envText) envText.style.color = "#ffffff"; 
if (confText) confText.style.color = "#ffffff";
    
// ✅ SPI (SVG stroke — correct)
if (spiCircle) {
    spiCircle.style.stroke = spiColor;
}

// ✅ ENV + CONF (USE BOX-SHADOW GLOW INSTEAD) 
    if (envCircle) {
    envCircle.style.borderColor = envColor;
    envCircle.style.boxShadow = `0 0 10px ${envColor}`; 
    }

if (confCircle) {
    confCircle.style.borderColor = confColor;
    confCircle.style.boxShadow = `0 0 6px ${confColor}`; 
}

// ================= CONF FEEDBACK ================= 
if (typeof confScoreValue === "number") {
    if (confScoreValue > 80) {
        score += 3;
    } else if (confScoreValue < 50) {
        score -= 3;
    }
}
}

function setRingProgress(selector, value) {
    const circle = document.querySelector(selector);
    if (!circle) return;

    const radius = 110;
    const circumference = 2 * Math.PI * radius;

    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = circumference * (1 - value / 100); 
}


// ✅ UPDATE UI
let bestZoneEl = document.getElementById("bestZone");
    if(bestZoneEl) {
        bestZoneEl.innerText = getBestZone();
    }

function getBestSPITrend() {
    let good = drops.filter(d => d.spi > 70);
    return good.length;
}
    
    // ================= TILE GLOW =================
    document.querySelectorAll(".tile").forEach(tile => {
        tile.style.boxShadow = SPI >= 80
            ? "0 0 12px rgba(0,255,156,0.25), inset 0 0 10px rgba(255,255,255,0.05)"
            : "0 6px 18px rgba(0,0,0,0.35), inset 0 0 10px rgba(255,255,255,0.05)";
    });

// =========================
// ✅ TACTICAL BAR
// =========================

// =====================================================
// 🧠 8. ENVIRONMENT HELPERS
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

   // =========================
    // ✅ ENV CALCULATION
    // =========================
function calculateENV(p, c, w, light, airTemp) {

    let score = 50; // neutral baseline

    // ================= PRESSURE =================
    let trend = getPressureTrend(p);

    if (p >= 1012 && p <= 1020) score += 8;
    else if (p < 1008 || p > 1025) score -= 8;

    if (trend === "rising") score += 10;
    if (trend === "falling") score -= 12;

    // ================= WIND =================
    if (w >= 5 && w <= 15) score += 12;
    else if (w < 2) score -= 10;
    else if (w > 20) score -= 6;

    // ================= CLOUD =================
    if (c >= 30 && c <= 70) score += 10;
    else if (c < 10) score -= 6;
    else if (c > 90) score -= 4;

    // ================= LIGHT =================
    if (light >= 40 && light <= 70) score += 10;
    else if (light < 20) score -= 6;
    else if (light > 85) score -= 8;

    // ================= TEMP TREND =================
    let tempTrend = getTempTrend(airTemp);

    if (tempTrend === "warming") score += 8;
    if (tempTrend === "cooling_fast") score -= 10;

    if(airTemp < 15) {
        score -= 5;
    }

    // ================= TIME WINDOWS =================
    let hour = new Date().getHours();

    if (hour >= 5 && hour <= 9) score += 12;
    if (hour >= 17 && hour <= 20) score += 14;
    if (hour >= 11 && hour <= 15) score -= 6;

    // ================= MOON =================
    let moon = getMoonPhase();

    if (moon === "Full") score += 5;
    if (moon === "New") score += 4;

    // ================= FINAL =================
    return Math.max(20, Math.min(95, Math.round(score))); }

    // ================= CALCULATE TEMP HISTORY FOR ENV========

function getTempTrend(t) {

    tempHistory.push(t);
    if (tempHistory.length > 6) tempHistory.shift();

    if (tempHistory.length < 2) return "stable";

    let tempDiff = tempHistory[tempHistory.length - 1] - tempHistory[0];

    if (tempDiff > 1) return "warming";
    if (tempDiff < -1) return "cooling_fast";

    return "stable";
}
    
function getMoonPhase(){
    let d=new Date();
    let lp=2551443;
    let now=d.getTime()/1000;
    let new_moon=592500;
    let phase=((now-new_moon)%lp)/lp;

    if(phase<0.25)return"Waxing";
    if(phase<0.5)return"Full";
    if(phase<0.75)return"Waning";
    return"New";
}

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

function sunriseWindow(){
    let h=new Date().getHours();
    if(h>=5 && h<=9)return 10;
    if(h>=17 && h<=20)return 12;
    return 0;
}

function getSeason(){
    let m = new Date().getMonth()+1;

    if(m<=2||m==12)return "Summer";
    if(m<=5)return "Autumn";
    if(m<=8)return "Winter";
    return "Spring";
}

function seasonalWeight(){
    let m=new Date().getMonth()+1;
    if(m<=2||m==12)return 8;
    if(m<=5)return 4;
    if(m<=8)return -4;
    return 6;
}

// =========================
// 🎯 CASTING INTELLIGENCE
// =========================

function getCastDirection(windDir) {

    if (compassHeading === null) {
        return "📍 Enable compass for casting direction";
    }

    let diff = Math.abs(windDir - compassHeading);
    if (diff > 180) diff = 360 - diff;

    if (diff > 135) {
        return "🔥 Cast into wind — focus on windward bank";
    }

    if (diff < 45) {
        return "❌ Avoid downwind — low feeding pressure";
    }

    return "⚠️ Crosswind — fish edges of wind lanes"; 
}


function getDepthStrategy(light, depth) {

    if (light < 30) {
        return "🌅 Fish shallow margins — low light feeding window";
    }

    if (light > 70) {
        return "🌞 Fish deeper or near structure — fish avoiding light";
    }

    if (depth >= 2 && depth <= 5) {
        return "🎯 Target patrol routes (2–5m zone)";
    }

    return "🔍 Adjust depth — locate feeding zones"; 
}

function getBaitSuggestion(SPI) {

    if (SPI > 75) {
        return "🍬 High-attract hookbait (pop-up, wafters, strong scent)";
    }

    if (SPI > 60) {
        return "🎣 Balanced boilie approach (bottom bait + matching free feed)";
    }

    return "🧪 Slow presentation — single hookbait or high visual pop-up"; 
}

function getPressureTrend(p){

    pressureHistory.push(p);

    if(pressureHistory.length>6) pressureHistory.shift();
    if(pressureHistory.length<2) return "stable";

    diff = pressureHistory[pressureHistory.length-1] - pressureHistory[0];

    if(diff>1)return "rising";
    if(diff<-1)return "falling";
    return "stable";
}

function getCastingAdvice(diff) {
    if (diff < 45) return "Into wind ⚠️";
    if (diff > 135) return "Perfect windward 🔥";
    return "Crosswind ⚠️";
}

// =====================================================
// 🧭 9. GPS + COMPASS + MAP
// =====================================================

// ============================
// 📍 INIT GPS (GET LOCATION)
// ============================
function initGPS() {

    if (!navigator.geolocation) {
        console.warn("GPS not supported");
        return;
    }

    navigator.geolocation.getCurrentPosition(

        (pos) => {

            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;

            // Save globally
            userLocation.lat = lat;
            userLocation.lon = lon;

            console.log("📍 GPS:", lat, lon);

            // Update map if already open
            if (mapInstance) {
                updateMapLocation(lat, lon);
            }

        },

        (err) => {
            console.warn("GPS error:", err);
            alert("Enable location services");
        },

        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// ============================
// 🗺️ OPEN MAP
// ============================
function openMap() {

    const mapScreen = document.getElementById("mapScreen");
    if (!mapScreen) return;

    mapScreen.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    setTimeout(() => {

        // Create map ONLY once
        if (!mapInstance) {

            const lat = userLocation?.lat || -26.2;
            const lon = userLocation?.lon || 28.0;

            mapInstance = L.map('mapContainer', {
                zoomControl: true
            }).setView([lat, lon], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '',
                maxZoom: 19
            }).addTo(mapInstance);

            updateMapLocation(lat, lon);
        }

        // Fix rendering
        setTimeout(() => {
            mapInstance.invalidateSize();
        }, 200);

    }, 300);
}

// ============================
// ❌ CLOSE MAP
// ============================
function closeMap() {
    const screen = document.getElementById("mapScreen");
    if (screen) screen.classList.add("hidden");
    document.body.style.overflow = "auto"; }


// ============================
// 📌 UPDATE MARKER (SINGLE SOURCE)
// ============================
function updateMapLocation(lat, lon) {

    if (!mapInstance) return;

    // Move camera
    mapInstance.setView([lat, lon], 13);

    // Create OR update marker
    if (!userMarker) {
        userMarker = L.marker([lat, lon])
            .addTo(mapInstance)
            .bindPopup("You are here 🎯");
    } else {
        userMarker.setLatLng([lat, lon]);
    }
}

// =====================================================
// 🎯 10. UI HELPERS
// =====================================================

function updateSPI(v){

    if (!v || isNaN(v)) return;
    
    let arc = document.getElementById("spiArc");
    if(!arc) return;

    let color = GREEN;

    if (v < 50) color = BLUE;
    else if (v < 70) color = WHITE;

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

// 🔥 AUTO AI UPDATE

    showInsight(
        SPI,
        envScore,
        confScoreValue,
        ENV.light || 50,
        ENV.depth || 3
    );

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

function openScout(){

    console.log("Scout mode opened");

    // 👉 Show Scout UI instead of scanning immediately
    document.getElementById("scoutScreen").classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

document.querySelectorAll(".opt").forEach(btn => {
    btn.addEventListener("click", () => {

        const type = btn.dataset.type;

        // remove active in same group
        document.querySelectorAll(`.opt[data-type="${type}"]`) 
            .forEach(el => el.classList.remove("active"));

        btn.classList.add("active");

        scoutData[type] = btn.dataset.value;
    });
});

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

function checkSensors() {

    let list = document.getElementById("sensorStatusList");

    if(list){
        list.innerHTML = "Connecting...";
    }

    fetch("http://192.168.4.1/data")
        .then(res => res.json())
        .then(data => {

   document.getElementById("sensorStatusList").innerHTML = `
    <div>Temperature ${data.main?.temp ? "✅" : "❌"}</div>
    <div>Pressure ${data.main?.pressure ? "✅" : "❌"}</div>
    <div>Oxygen ${data.oxygen ? "✅" : "❌"}</div>
    <div>Turbidity ${data.turbidity ? "✅" : "❌"}</div>
    <div>Light ${data.light ? "✅" : "❌"}</div>
    <div>Depth ${data.depth ? "✅" : "❌"}</div>
    <div>Battery ${data.battery ? "✅" : "❌"}</div> `;

        })
        .catch(() => {

            document.getElementById("sensorStatusList").innerHTML = `
                <div style="color:#ff3b3b;">❌ Connection failed</div>
                <div style="opacity:0.7; margin-top:6px;">Check WiFi (AIF Sensor)</div>
            `;
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

        fetch("http://192.168.4.1/data")
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


function showSummary(){

    let screen = document.getElementById("scoutScreen");

    screen.innerHTML = `
        <div class="scout-title">Scan Complete</div>

        <div>Clarity: ${scoutData.clarity || "-"}</div>
        <div>Birds: ${scoutData.birds || "-"}</div>
        <div>Activity: ${scoutData.activity || "-"}</div>

        <div style="margin-top:20px;">SPI Updated</div>

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
    console.log("DROP CLICKED");

    let dropData = {
        time: Date.now(),
        lat: userLocation?.lat || null,
        lon: userLocation?.lon || null,
        spi: SPI,
        scout: scoutData,
        success: false
    };

    drops.push(dropData);
    
    console.log("DROP SAVED:", dropData); 

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
    document.body.style.overflow = "auto"; }

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
          <div>📍 ${d.lat.toFixed(4)}, ${d.lon.toFixed(4)}</div> 
          </div>
        `;
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
            if (d.lat && d.lon) {
                L.marker([d.lat, d.lon])
                    .addTo(reportMapInstance)
                    .bindPopup(`SPI: ${d.spi}%`);
    }
});

        // add drops
        drops.forEach(d => {

            if (!d.lat || !d.lon) return;

            L.marker([d.lat, d.lon])
                .addTo(reportMapInstance)
                .bindPopup(`SPI: ${d.spi.toFixed(1)}%`);
        });

        setTimeout(() => {
            reportMapInstance.invalidateSize();
        }, 200);

    }, 300);
}

function getBestDropZone() {

    let highDrops = drops.filter(d => d.spi >= 70);

    if (highDrops.length === 0) return "No strong zone yet";

    let avgLat = highDrops.reduce((sum, d) => sum + d.lat, 0) / highDrops.length;
    let avgLon = highDrops.reduce((sum, d) => sum + d.lon, 0) / highDrops.length;

    return `Lat ${avgLat.toFixed(3)}, Lon ${avgLon.toFixed(3)}`; 
}

function getBestZone() {
    if (SPI >= 75) {
    return "strong";
} else {
    return "normal";
}
}

function setFishingZone(targetAngle) {
  const ticks = document.querySelectorAll(".tick");
  const zoneStrength = getBestZone();

  ticks.forEach(tick => {
    const angle = parseInt(tick.dataset.angle);

    let diff = Math.abs(angle - targetAngle);
    if (diff > 180) diff = 360 - diff;

    const zoneWidth = SPI >= 75 ? 30 : 20;
      
    tick.classList.remove("active-zone", "active-zone-strong");
      
      if (diff < zoneWidth) {
      if (zoneStrength === "strong") {
        tick.classList.add("active-zone-strong");
      } else {
        tick.classList.add("active-zone");
      }
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

window.retryConnection = retryConnection;
window.startScan = startScan;
window.closeScout = closeScout;
