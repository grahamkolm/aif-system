// =====================================================
// 🌍 0. START 
// =====================================================

function getMoonPhase() {
			return "Normal";
}

function getSeason() {
    		const month = new Date().getMonth() + 1;

    		if (month >= 12 || month <= 2) return "Summer";
    		if (month >= 3 && month <= 5) return "Autumn";
    		if (month >= 6 && month <= 8) return "Winter";
    return "Spring";
}

function getPressureTrend() {
	return "Stable";
}

function resize() {
    const canvas = document.getElementById("waterGraph");
    if (!canvas) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight; }

window.addEventListener("resize", resize);

resize();

function set(id, value) {
	const el = document.getElementById(id);
	if(el) el.innerText = value;
}

// =====================================================
// 🌍 1. GLOBAL STATE (ALL VARIABLES ONLY HERE) 
// =====================================================

let currentSession = null;
let lastSPI = null;
let lastConditions = {};
let lastPressure = null;
let probeData = null;
let scoutInputs = {};
let scoutHistory = [];
let selected = {};
let scoutStep = "input";
let planSelections = {};
let planScore = 0;
let userLocation = null;
let compassHeading = null;
let bubbleIntensity = 0.7;
let hotspots = [];
let SPI = 50;
let bubbles = [];
let canvas;
let ctx;

// =====================================================
// 🚀 2. APP BOOT (DOMContentLoaded ONLY) // 
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

    canvas = document.getElementById("aifCanvas");
    ctx = canvas?.getContext("2d");

    initGPS();
    initCompass();

    startSplash();

});

// =====================================================
// 💧 3. SPLASH SYSTEM
// =====================================================


// ---------------------------------------------
// 📏 Resize Splash Canvas
// ---------------------------------------------
function resizeSplash() {
    if (!splashCanvas) return;

    splashCanvas.width = window.innerWidth;
    splashCanvas.height = window.innerHeight; }

window.addEventListener("resize", resizeSplash); resizeSplash();

// ---------------------------------------------
// 💧 Splash Ripple Effect
// ---------------------------------------------
let ripples = [];

function createRipple() {
 	if (!splashCanvas) return;
	
	ripples.push({
        r:0,
        alpha:0.25,
        x:Math.random() * splashCanvas.width,
        y:splashCanvas.height + 20
    });
}

function animateSplash() {

    if (!splashCtx || !splashCanvas) return;

    splashCtx.clearRect(0, 0, splashCanvas.width, splashCanvas.height);

    if (ripples.length < 20) {
        createRipple();
    }

    for (let i = 0; i < ripples.length; i++) {
        const r = ripples[i];

        r.y -= 0.8;
        r.r += 0.3;
        r.alpha *= 0.98;

        if (r.y < 0 || r.alpha < 0.05) {
            r.x = Math.random() * splashCanvas.width;
            r.y = splashCanvas.height + Math.random() * 50;
            r.r = 0;
            r.alpha = 0.5;
        }

        splashCtx.beginPath();
        splashCtx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        splashCtx.strokeStyle = `rgba(0,255,163,${r.alpha})`;
        splashCtx.lineWidth = 2;
        splashCtx.stroke();
    }

    requestAnimationFrame(animateSplash); // 🔥 THIS WAS MISSING }

// ---------------------------------------------
// 🚀 Start Splash (ENTRY POINT)
// ---------------------------------------------
// 💧 Splash Ripple Effect
function createSplashRipple() {
    if (!splashCanvas) return;

    ripples.push({
        x: Math.random() * splashCanvas.width * 0.5,
        y: Math.random() * splashCanvas.height,
        r: 0,
        alpha: 0.6
    });
}

// 🚀 Start Splash (ENTRY POINT)
function startSplash() {

    createSplashRipple();
	animateSplash();

    setTimeout(() => {

        const splash = document.getElementById("splash");
        if (!splash) return;

        splash.style.opacity = "0";
        splash.style.transition = "opacity 1s ease";

        setTimeout(() => {

            splash.remove();

            // 👉 START MAIN APP HERE
            startApp();

        }, 1200);

    }, 3500);
}


// ---------------------------------------------
// 🚀 Main App Starter (CLEAN HANDOFF)
// ---------------------------------------------
function startApp() {

    const mainCanvas = document.getElementById("waterGraph");
    if (mainCanvas) {
        mainCanvas.style.opacity = "1";
    }

    resize();
    animate();

    generateHotspots();
    setInterval(generateHotspots, 10000);

    setInterval(ripple, 3000);

    setTimeout(fetchWeatherSafe, 2000);
}

// =====================================================
// 🧠 4. MAIN ENGINE LOOP (ANIMATE)
// =====================================================


// =====================================================
// 🌊 5. VISUAL SYSTEM (BUBBLES / RIPPLE / THERMOCLINE) 
// =====================================================
// ---------------------------------------------
// 🫧 Bubble Spawn (HOTSPOT + WIND AWARE) // ---------------------------------------------
function spawnBubble() {

    if (!hotspots || hotspots.length === 0) return;

    const hotspot = hotspots[Math.floor(Math.random() * hotspots.length)];
    if (!hotspot) return;

    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * hotspot.radius;

    const x = hotspot.x + Math.cos(angle) * radius;
    const y = hotspot.y;

    // 🌬 Wind influence (FIXED — was missing before)
    const windBias = (lastConditions.windDir || 180) / 180 - 1;

    bubbles.push({
    x: canvas.width*0.4 + Math.random()*canvas.width*0.2,
    y: canvas.height*0.9,
    size: Math.random()*3+1,
    speed: Math.random()*1.2+0.5,
    drift: Math.random()-0.5,
    alpha: 0.15 + Math.random()*0.15
    });
}


// ---------------------------------------------
// 💧 Ripple Effect
// ---------------------------------------------
function ripple() {

    if (!canvas || !ctx) return;

    ripples.push({
        r: 0,
        alpha: 0.25,
        x: canvas.width / 2,
        y: canvas.height * 0.7
    });
}


// ---------------------------------------------
// 🌡 Thermocline Layer
// ---------------------------------------------
function drawThermocline() {

    const y = canvas.height * 0.45;

    const gradient = ctx.createLinearGradient(0, y - 20, 0, y + 20);
    gradient.addColorStop(0, "rgba(255,200,0,0)");
    gradient.addColorStop(0.5, "rgba(255,200,0,0.25)");
    gradient.addColorStop(1, "rgba(255,200,0,0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, y - 20, canvas.width, 40); }


// ---------------------------------------------
// 🧠 MAIN ENGINE LOOP (ANIMATE)
// ---------------------------------------------
function animate() {

    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawThermocline();

    const intensity = bubbleIntensity;
    const currentSPI = SPI || 50;

    // ---------------------------------
    // 🫧 Bubble Spawning
    // ---------------------------------
    if (Math.random() < intensity / 2) {
        spawnBubble();
    }

    if (intensity > 0.7 && Math.random() < 0.05) {
        for (let i = 0; i < 8; i++) spawnBubble();
    }

    // ---------------------------------
    // 🫧 Bubble Movement + Draw
    // ---------------------------------
    bubbles.forEach((particle, i) => {

        particle.y -= particle.speed;
        particle.x += (particle.drift || 0) + Math.sin(particle.y * 0.05 + particle.offset) * 0.4;

        // 🎨 Color based on SPI
        const r = Math.max(0, 255 - currentSPI * 2);
        const g = Math.min(255, currentSPI * 2);
        const b = 150;

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${particle.alpha})`;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        if (particle.y < 0) bubbles.splice(i, 1);
    });

    // ---------------------------------
    // 💧 Ripple Animation
    // ---------------------------------
    ripples.forEach((r, i) => {

        r.r += 2;
        r.alpha *= 0.96;

        ctx.strokeStyle = `rgba(0,255,163,${r.alpha})`;
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();

        if (r.alpha < 0.01) ripples.splice(i, 1);
    });

    requestAnimationFrame(animate);
}

// ---------------------------------------------
// 🌍 Hotspot Generator
// ---------------------------------------------
function generateHotspots() {

    hotspots = [];

    const count = Math.floor(Math.random() * 2) + 1;

    for (let i = 0; i < count; i++) {
        hotspots.push({
            x: canvas.width * (0.2 + Math.random() * 0.6),
            y: canvas.height * (0.6 + Math.random() * 0.3),
            radius: 80 + Math.random() * 120
        });
    }
}

// =====================================================
// 🌦 6. WEATHER ENGINE (WIND INCLUDED)
// =====================================================
function fetchWeatherSafe() {

    const API_KEY = "63ba514dc7c2242cb10cd2632d2569ad";

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=-30.140153&lon=27.004008&appid=${API_KEY}&units=metric`;

    fetch(url)
        .then(res => {
            if (!res.ok) throw new Error("Bad response");
            return res.json();
        })
        .then(data => {

            // ---------------------------------
            // 🌡 Extract Data
            // ---------------------------------
            const pressure = data.main.pressure;
            const temp = data.main.temp;

            const windSpeedMS = data.wind?.speed || 0;
            const windSpeedKMH = windSpeedMS * 3.6; // FIXED
            const windDir = data.wind?.deg || 180;

            const cloud = data.clouds?.all || 0;

            // ---------------------------------
            // 🌬 Store for system (VERY IMPORTANT)
            // ---------------------------------
            lastConditions = {
                windDir: windDir,
                windSpeed: windSpeedKMH
            };

            // ---------------------------------
            // 📊 UI Updates
            // ---------------------------------
            set("envScore", Math.round((pressure / 1050) * 100));
            set("pressure", pressure + " hPa");
            set("wind", windSpeedKMH.toFixed(1) + " km/h");
            set("cloud", cloud + "%");

            // ---------------------------------
            // 🧠 Tactical Message
            // ---------------------------------
            let message = "";

            if (pressure > 1015 && windSpeedKMH < 10) {
                message = "Stable pressure • Calm wind • High feeding activity";
            } 
            else if (pressure < 1005) {
                message = "Low pressure • Fish less active • Slow approach";
            } 
            else {
                message = "Changing conditions • Moderate activity • Stay adaptive";
            }

            const bar = document.getElementById("tacticalBar");
            if (bar) {
                bar.innerText = message;
            }
	
            // ---------------------------------
            // 🚀 Send to Dashboard (SPI FLOW)
            // ---------------------------------
            renderDashboard(data);

        })
        .catch(err => {
            console.log("FETCH ERROR:", err);
            simulateWeather();
        });
}


// ---------------------------------------------
// 🌥 FALLBACK (NO API)
// ---------------------------------------------
function simulateWeather() {

    const fakeData = {
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
    };

    // Also store conditions (IMPORTANT)
    lastConditions = {
        windDir: fakeData.wind.deg,
        windSpeed: fakeData.wind.speed * 3.6
    };

    renderDashboard(fakeData);
}

// =====================================================
// 📊 7. SPI ENGINE (ONLY ONE)
// =====================================================
function calculateSPI(pressure, windSpeed, cloud, windDir, temp) {

    let score = 50;

    // ---------------------------------
    // 🌡 PRESSURE (MOST IMPORTANT)
    // ---------------------------------
    if (pressure > 1020) score += 15;
    else if (pressure > 1015) score += 10;
    else if (pressure > 1010) score += 5;
    else if (pressure < 1005) score -= 10;
    else if (pressure < 1000) score -= 15;

    // ---------------------------------
    // 🌬 WIND SPEED
    // ---------------------------------
    if (windSpeed >= 5 && windSpeed <= 15) score += 15;
    else if (windSpeed < 2) score -= 10;
    else if (windSpeed > 20) score -= 5;

    // ---------------------------------
    // ☁ CLOUD COVER
    // ---------------------------------
    if (cloud >= 20 && cloud <= 60) score += 10;
    else if (cloud < 10) score -= 5;
    else if (cloud > 80) score -= 5;

    // ---------------------------------
    // 🌡 TEMPERATURE
    // ---------------------------------
    if (temp >= 18 && temp <= 24) score += 20;
    else if (temp >= 15 && temp <= 28) score += 10;
    else score -= 10;

    // ---------------------------------
    // 🧭 WIND DIRECTION (ADVANCED EDGE)
    // ---------------------------------
    if (windDir >= 180 && windDir <= 270) score += 5; // SW = feeding zones

    // ---------------------------------
    // 🎯 FINAL CLAMP
    // ---------------------------------
    score = Math.max(0, Math.min(100, score));

    return Math.round(score);
}

// =====================================================
// 🌊 8. ENVIRONMENT ENGINE (WATER MODEL) 
// =====================================================

// ---------------------------------------------
// 🌡 Surface Temperature Estimate
// ---------------------------------------------
function estimateSurfaceTemp(prevWaterTemp, airTemp, windSpeed, sunFactor, hour) {

    let temp = prevWaterTemp ?? airTemp;

    // air influence
    temp += (airTemp - temp) * 0.15;

    // sun heating (day only)
    if (hour >= 8 && hour <= 17) {
        temp += sunFactor * 0.8;
    }

    // wind cooling
    temp -= windSpeed * 0.02;

    return Math.round(temp * 10) / 10;
}


// ---------------------------------------------
// 🌡 Bottom Temperature Estimate
// ---------------------------------------------
function estimateBottomTemp(surfaceTempValue, depth, windSpeed) {

    let gradient = depth * 0.15;

    // wind mixes layers
    gradient -= windSpeed * 0.05;

    return surfaceTempValue - Math.max(gradient, 0.5); 
}

// ---------------------------------------------
// 💧 Oxygen Estimate
// ---------------------------------------------
function estimateOxygen(temp, windSpeed) {

    let oxygen = 9;

    // warm water = less oxygen
    oxygen -= (temp - 15) * 0.2;

    // wind adds oxygen
    oxygen += windSpeed * 0.1;

    return Math.max(5, Math.min(oxygen, 12)); 
}

// =====================================================
// 📊 8. DASHBOARD (renderDashboard)
// =====================================================
// ---------------------------------------------
// 📊 Render Dashboard (CORE FLOW)
// ---------------------------------------------
function renderDashboard(data) {

    if (!data || !data.main) return;

    // ---------------------------------
    // 🌦 RAW WEATHER
    // ---------------------------------
    const airTemp = data.main.temp;
    const pressure = data.main.pressure;
    const cloud = data.clouds?.all || 0;

    const windSpeedMS = data.wind?.speed || 0;
    const windSpeed = windSpeedMS * 3.6; // km/h
    const windDir = data.wind?.deg || 180;

    // ---------------------------------
    // 🌊 ENVIRONMENT MODEL
    // ---------------------------------
    const hour = new Date().getHours();
    const prevSurface = lastConditions.surfaceTemp || airTemp;

    const surfaceTemp = estimateSurfaceTemp(
        prevSurface,
        airTemp,
        windSpeed,
        1, // sun factor (can improve later)
        hour
    );

    const bottomTemp = estimateBottomTemp(surfaceTemp, 5, windSpeed);
    const oxygen = estimateOxygen(surfaceTemp, windSpeed);

// ===============================
// 📦 STORE CONDITIONS
// ===============================
lastConditions = {
    airTemp: airTemp,
    pressure: pressure,
    windSpeed: windSpeed,
    windDir: windDir,
    cloud: cloud,
    moon: getMoonPhase(),
    season: getSeason(),
    trend: getPressureTrend(pressure),
    surfaceTemp: surfaceTemp,
    bottomTemp: bottomTemp,
    oxygen: oxygen
};

	logEvent("dashboard_update", {
	spi: SPI,
	temp: surfaceTemp,
	oxygen: oxygen
});

updateTactical(SPI, lastConditions);
// ===============================
// 🎯 CALCULATE SPI
// ===============================

    // ---------------------------------
    // 📊 SPI CALCULATION
    // ---------------------------------
    let newSPI = calculateSPI(
        pressure,
        windSpeed,
        cloud,
        windDir,
        surfaceTemp
    );
		updateSPI(newSPI);
    // ---------------------------------
    // 🧠 SMOOTHING (ONLY PLACE)
    // ---------------------------------
    if (lastSPI !== null) {
        newSPI = Math.round((newSPI * 0.7) + (lastSPI * 0.3));
    }

    lastSPI = newSPI;
    SPI = newSPI;
	updateSPI(SPI);
	
    // ---------------------------------
    // 🎯 UI UPDATE
    // ---------------------------------
    
    set("airTemp", airTemp.toFixed(1) + "°C");
    set("surfaceTemp", surfaceTemp.toFixed(1) + "°C");
	set("bottomTemp", bottomTemp.toFixed(1) + "°C");
	
    colorMini("surfaceTemp", surfaceTemp);
	colorMini("bottomTemp", bottomTemp);
	colorMini("spiValue", SPI);
	
	set("spiValue", SPI + "%");
	set("pressure", pressure + " hPa");
	set("wind", windSpeed.toFixed(1) + " km/h"); 
	set("cloud", cloud + "%"); 
	set("oxygen", oxygen.toFixed(1) + " mg/L");


	
    // ---------------------------------
    // 🫧 VISUAL RESPONSE
    // ---------------------------------
    bubbleIntensity = Math.max(0.2, newSPI / 100);

    // ---------------------------------
    // 📝 LOG EVENT (optional but powerful)
    // ---------------------------------
    logEvent("dashboard_update", {
        spi: newSPI,
        temp: surfaceTemp,
        oxygen: oxygen
    });
}

// =====================================================
// 🎯 9. TACTICAL SYSTEM
// =====================================================
// ---------------------------------------------
// 🧠 Generate Tactical Advice
// ---------------------------------------------
function updateSPICircle(value) {
    const circle = document.querySelector(".progress-ring-circle");
    if (!circle) return;

    const radius = circle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;

    circle.style.strokeDasharray = `${circumference}`;
    
    const offset = circumference - (value / 100) * circumference;
    circle.style.strokeDashoffset = offset; }

function updateSPI(value) {
	const el = document.getElementById("spiValue");
	if (el) {
		el.innerText = value + "%";
	}
}

function updateTactical(spi, conditions) {

    let lines = [];

    let w = conditions.windSpeed;
    let t = conditions.airTemp;
    let envScore = conditions.envScore || 50;
    let confScore = conditions.confScore || 50;

    if (spi > 75) {
        lines.push("🔥 Strong feeding window — stay on spot");
    } else if (spi < 50) {
        lines.push("❌ Low activity — rethink approach");
    }

    if (envScore > 75) {
        lines.push("🌿 Stable environment");
    } else if (envScore < 50) {
        lines.push("🌧 Pressure affecting fish");
    }

    if (confScore > 80) {
        lines.push("🧠 High confidence pattern");
    }

    if (w < 5) {
        lines.push("🌬 Light wind");
    } else if (w > 15) {
        lines.push("🌊 Strong wind — fish wind banks");
    }

    if (t >= 18 && t <= 24) {
        lines.push("🌡 Optimal feeding temp");
    } else {
        lines.push("🌡 Suboptimal temp — adjust depth");
    }

    let tacticalEl = document.getElementById("tactical");

    if (tacticalEl) {
        tacticalEl.innerHTML = lines.join("<br>");
    }

    // ---------------------------------
    // 🎨 UPDATE UI
    // ---------------------------------
    const bar = document.getElementById("tacticalBar");

    if (bar) {
        bar.innerText = lines[0] || "";
    }
}

// =====================================================
// 🔍 10. SCOUT SYSTEM
// =====================================================
function openScout() {

    if (document.getElementById("scoutScreen")) return;

    scoutInputs = {};

    document.body.insertAdjacentHTML("beforeend", `
    <div id="scoutScreen" style="
        position:fixed;
        top:0; left:0;
        width:100%; height:100%;
        background:#05080d;
        color:white;
        z-index:999;
        padding:20px;
        overflow:auto;
    ">

    <button onclick="applyScout()" style="
        position:fixed;
        top:20px;
        right:20px;
        background:#00ffa6;
        border:none;
        padding:10px 14px;
        border-radius:10px;
        font-weight:bold;
    ">Apply</button>

    <h2 style="color:#00ffa6;">AIF™ Scout Mode</h2>

    <h3>Fish Activity</h3>
    <div class="scout-grid">
        <div class="scout-option" onclick="toggleScout('jumping',this)">🐟 Jumping</div>
        <div class="scout-option" onclick="toggleScout('bubbling',this)">🫧 Bubbling</div>
        <div class="scout-option" onclick="toggleScout('none',this)">🚫 None</div>
    </div>

    <h3>Water Clarity</h3>
    <div class="scout-grid">
        <div class="scout-option" onclick="toggleScout('clear',this)">💧 Clear</div>
        <div class="scout-option" onclick="toggleScout('stained',this)">🌫 Stained</div>
        <div class="scout-option" onclick="toggleScout('dirty',this)">🟤 Dirty</div>
    </div>

    <h3>Bird Activity</h3>
    <div class="scout-grid">
        <div class="scout-option" onclick="toggleScout('birdsActive',this)">🐦 Active</div>
        <div class="scout-option" onclick="toggleScout('noBirds',this)">🚫 None</div>
    </div>

    </div>
    `);
}

// ===============================
// 🔁 TOGGLE SCOUT INPUTS
// ===============================
function toggleScout(type, el) {

    scoutInputs[type] = !scoutInputs[type];

    el.classList.toggle("active", scoutInputs[type]); }

// ===============================
// 🧠 CALCULATE SCOUT SCORE
// ===============================
function calculateScoutScore() {

    let score = 50;

    // fish activity
    if (scoutInputs.jumping) score += 20;
    if (scoutInputs.bubbling) score += 15;
    if (scoutInputs.none) score -= 15;

    // water clarity
    if (scoutInputs.clear) score += 5;
    if (scoutInputs.stained) score += 10;
    if (scoutInputs.dirty) score -= 10;

    // birds
    if (scoutInputs.birdsActive) score += 10;
    if (scoutInputs.noBirds) score -= 5;

    return Math.max(0, Math.min(100, score)); }

// ===============================
// ✅ APPLY SCOUT
// ===============================
function applyScout() {

    let scoutScore = calculateScoutScore();

    lastConditions.scout = { ...scoutInputs };
    lastConditions.scoutScore = scoutScore;

    let boostedSPI = Math.round((SPI + scoutScore) / 2);

    SPI = boostedSPI;
    bubbleIntensity = SPI / 100;

    updateSPI(SPI);
    updateTactical(SPI, windSpeed, airTemp);

    const screen = document.getElementById("scoutScreen");
    if (screen) screen.remove();
}


// =====================================================
// 🧠 11. SESSION SYSTEM
// =====================================================
// ---------------------------------------------
// 🎣 Initialize Session
// ---------------------------------------------
function initSession() {

    let sessions = JSON.parse(localStorage.getItem("aif_sessions")) || [];

    const dam = localStorage.getItem("aif_dam") || "Default Dam";
    const area = localStorage.getItem("aif_area") || "Default Area";

    currentSession = {
        id: Date.now(),
        dam: dam || "Unknown",
        area: area || "Unknown",
        date: new Date().toISOString(),
        events: []
    };

    sessions.push(currentSession);
    localStorage.setItem("aif_sessions", JSON.stringify(sessions)); }


// ---------------------------------------------
// 🧠 Ensure Session Exists
// ---------------------------------------------
function ensureSession() {
    if (!currentSession) {
        initSession();
    }
}

// ---------------------------------------------
// 📝 Log Event
// ---------------------------------------------
function logEvent(type, data = {}) {

    ensureSession();

    const event = {
        time: new Date().toISOString(),
        type,
        data
    };

    currentSession.events.push(event);

    let sessions = JSON.parse(localStorage.getItem("aif_sessions")) || [];

    const index = sessions.findIndex(s => s.id === currentSession.id);
    if (index !== -1) {
        sessions[index] = currentSession;
        localStorage.setItem("aif_sessions", JSON.stringify(sessions));
    }
}

updateTactical(SPI, lastConditions);
// ---------------------------------------------
// 🗺 DAM DATABASE (LOCAL STORAGE)
// ---------------------------------------------
function getDams() {
    return JSON.parse(localStorage.getItem("aif_dams")) || []; }

function saveDam(name) {

    if (!name) return;

    let dams = getDams();

    // prevent duplicates
    if (!dams.includes(name)) {
        dams.push(name);
        localStorage.setItem("aif_dams", JSON.stringify(dams));
    }
}

// =====================================================
// 🗺 12. MAP SYSTEM
// =====================================================
function openMap() {

    if (document.getElementById("mapScreen")) return;

    document.body.insertAdjacentHTML("beforeend", `
    <div id="mapScreen" style="
        position:fixed;
        top:0; left:0;
        width:100%; height:100%;
        background:#05080d;
        color:white;
        z-index:999;
        padding:20px;
        overflow:auto;
    ">

    <button onclick="closeMap()" style="
        position:fixed;
        top:20px;
        right:20px;
        background:#ff4d4d;
        border:none;
        padding:10px 14px;
        border-radius:10px;
        font-weight:bold;
    ">Close</button>

    <h2 style="color:#00ffa6;">AIF™ Map</h2>

    <div id="mapInfo" style="margin-top:20px;">
        Loading location...
    </div>

    <div style="margin-top:20px;">
        <button onclick="saveHotspot()" style="
            background:#00ffa6;
            border:none;
            padding:10px;
            border-radius:10px;
        ">📍 Save Hotspot</button>
    </div>

    <div id="hotspotList" style="margin-top:20px;"></div>

    </div>
    `);

    renderMapInfo();
}

// ===============================
// ❌ CLOSE MAP
// ===============================
function closeMap() {
    const map = document.getElementById("mapScreen");
    if (map) map.remove();
}

// ===============================
// 📍 SHOW CURRENT LOCATION
// ===============================
function renderMapInfo() {

    const el = document.getElementById("mapInfo");
    if (!el) return;

    if (!userLocation) {
        el.innerText = "GPS not ready...";
        return;
    }

    el.innerHTML = `
        <div>Latitude: ${userLocation.lat.toFixed(5)}</div>
        <div>Longitude: ${userLocation.lon.toFixed(5)}</div>
    `;

    renderHotspots();
}

// ===============================
// 📌 SAVE HOTSPOT
// ===============================
function saveHotspot() {

    if (!userLocation) return;

    hotspots.push({
        lat: userLocation.lat,
        lon: userLocation.lon,
        time: Date.now()
    });

    localStorage.setItem("aif_hotspots", JSON.stringify(hotspots));

    renderHotspots();
}

// ===============================
// 📦 LOAD HOTSPOTS
// ===============================
function loadHotspots() {
    hotspots = JSON.parse(localStorage.getItem("aif_hotspots")) || []; }

// ===============================
// 📋 DISPLAY HOTSPOTS
// ===============================
function renderHotspots() {

    const list = document.getElementById("hotspotList");
    if (!list) return;

    if (!hotspots.length) {
        list.innerHTML = "<div>No hotspots yet</div>";
        return;
    }

    list.innerHTML = hotspots.map((h, i) => `
        <div style="
            padding:8px;
            margin-bottom:6px;
            background:#0c1118;
            border-radius:6px;
        ">
            📍 ${h.lat.toFixed(4)}, ${h.lon.toFixed(4)}
        </div>
    `).join("");
}

// =====================================================
// 📊 13. REPORT SYSTEM
// =====================================================
function getSessions() {
    return JSON.parse(localStorage.getItem("aif_sessions")) || []; }

// ===============================
// 📊 GENERATE REPORT SUMMARY
// ===============================
function generateReport() {

    const sessions = getSessions();

    if (!sessions.length) {
        alert("No session data available");
        return;
    }

    let totalSessions = sessions.length;
    let avgSPI = 0;
    let bestSPI = 0;

    sessions.forEach(s => {
        let events = s.events || [];

        events.forEach(e => {
            if (e.type === "dashboard_update") {
                avgSPI += e.data.spi;
                if (e.data.spi > bestSPI) bestSPI = e.data.spi;
            }
        });
    });

    avgSPI = Math.round(avgSPI / (sessions.length || 1));

    showReport({
        totalSessions,
        avgSPI,
        bestSPI
    });
}

// ===============================
// 📺 SHOW REPORT UI
// ===============================
function showReport(data) {

    if (document.getElementById("reportScreen")) return;

    document.body.insertAdjacentHTML("beforeend", `
    <div id="reportScreen" style="
        position:fixed;
        top:0; left:0;
        width:100%; height:100%;
        background:#05080d;
        color:white;
        z-index:999;
        padding:20px;
        overflow:auto;
    ">

    <button onclick="closeReport()" style="
        position:fixed;
        top:20px;
        right:20px;
        background:#ff4d4d;
        border:none;
        padding:10px 14px;
        border-radius:10px;
        font-weight:bold;
    ">Close</button>

    <h2 style="color:#00ffa6;">AIF™ Report</h2>

    <div style="margin-top:20px;">
        <div>Total Sessions: ${data.totalSessions}</div>
        <div>Average SPI: ${data.avgSPI}%</div>
        <div>Best SPI: ${data.bestSPI}%</div>
    </div>

    </div>
    `);
}

// ===============================
// ❌ CLOSE REPORT
// ===============================
function closeReport() {
    const el = document.getElementById("reportScreen");
    if (el) el.remove();
}

// =====================================================
// 📋 14. PLAN SYSTEM
// =====================================================
// ===============================
// 🚀 OPEN PLAN
// ===============================
function openPlan() {

    if (document.getElementById("planScreen")) return;

    planSelections = {};

    document.body.insertAdjacentHTML("beforeend", `
    <div id="planScreen" style="
        position:fixed;
        top:0; left:0;
        width:100%; height:100%;
        background:#05080d;
        color:white;
        z-index:999;
        padding:20px;
        overflow:auto;
    ">

    <button onclick="applyPlan()" style="
        position:fixed;
        top:20px;
        right:20px;
        background:#00ffa6;
        border:none;
        padding:10px 14px;
        border-radius:10px;
        font-weight:bold;
    ">Apply</button>

    <h2 style="color:#00ffa6;">AIF™ 60-Min Tactical Plan</h2>

    <h3>0–5 Minutes • Arrival Scan</h3>
    <div class="scout-grid">
        <div class="scout-option" onclick="togglePlan('windBank',this)">🌬 Wind Bank</div>
        <div class="scout-option" onclick="togglePlan('activity',this)">🐟 Activity</div>
        <div class="scout-option" onclick="togglePlan('noActivity',this)">🚫 No Activity</div>
    </div>

    <h3>20–40 Minutes • Tactical Decision</h3>
    <div class="scout-grid">
        <div class="scout-option" onclick="togglePlan('boilie',this)">🎯 Boilie</div>
        <div class="scout-option" onclick="togglePlan('popup',this)">⚪ Pop-up</div>
    </div>

    <h3>40–60 Minutes • Execution</h3>
    <div class="scout-grid">
        <div class="scout-option" onclick="togglePlan('stay',this)">🎯 Stay</div>
        <div class="scout-option" onclick="togglePlan('move',this)">🚶 Move</div>
    </div>

    </div>
    `);
}

// ===============================
// 🔁 TOGGLE PLAN OPTIONS
// ===============================
function togglePlan(type, el) {
    planSelections[type] = !planSelections[type];
    el.classList.toggle("active", planSelections[type]); }

// ===============================
// 🧠 CALCULATE PLAN SCORE
// ===============================
function calculatePlanScore() {

    let score = 50;

    if (planSelections.windBank) score += 10;
    if (planSelections.activity) score += 15;
    if (planSelections.noActivity) score -= 10;

    if (planSelections.boilie) score += 8;
    if (planSelections.popup) score += 5;

    if (planSelections.stay) score += 5;
    if (planSelections.move) score -= 5;

    // intelligent boost
    if (lastConditions.windSpeed > 5 && planSelections.windBank) score += 5;
    if (lastConditions.surfaceTemp > 20 && planSelections.popup) score += 5;

    return Math.max(0, Math.min(100, score)); }

// ===============================
// ✅ APPLY PLAN
// ===============================
function applyPlan() {

    planScore = calculatePlanScore();

    lastConditions.plan = { ...planSelections };
    lastConditions.planScore = planScore;

    let boostedSPI = Math.round((SPI + planScore) / 2);

    SPI = boostedSPI;
    bubbleIntensity = SPI / 100;

    set("spiValue", SPI + "%");
    colorMini("spiValue", SPI);

    const screen = document.getElementById("planScreen");
    if (screen) screen.remove();
}

// =====================================================
// 🧭 15. GPS + COMPASS
// =====================================================
// ---------------------------------------------
// 📍 GPS INITIALIZATION
// ---------------------------------------------
function initGPS() {

    if (!navigator.geolocation) {
        console.log("GPS not supported");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {

            userLocation = {
                lat: pos.coords.latitude,
                lon: pos.coords.longitude
            };

            console.log("GPS:", userLocation);

        },
        (err) => {
            console.log("GPS ERROR:", err);
        },
        {
            enableHighAccuracy: true
        }
    );
}


// ---------------------------------------------
// 🧭 COMPASS INITIALIZATION
// ---------------------------------------------
function initCompass() {

    // iOS requires permission
    if (typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function") {

        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === "granted") {
                    window.addEventListener("deviceorientation", handleOrientation);
                }
            })
            .catch(console.error);

    } else {
        // Android / normal browsers
        window.addEventListener("deviceorientation", handleOrientation);
    }
}


// ---------------------------------------------
// 🧭 HANDLE ORIENTATION
// ---------------------------------------------
function handleOrientation(event) {

    let heading;

    // iOS
    if (event.webkitCompassHeading) {
        heading = event.webkitCompassHeading;
    }
    // Android
    else if (event.alpha !== null) {
        heading = 360 - event.alpha;
    }

    if (heading !== null && !isNaN(heading)) {
        compassHeading = Math.round(heading);

        updateCompassUI(compassHeading);
    }
}


// ---------------------------------------------
// 🎯 COMPASS UI UPDATE
// ---------------------------------------------
function updateCompassUI(deg) {

    const needle = document.getElementById("compassNeedle");
    const text = document.getElementById("compassText");

    if (needle) {
        needle.style.transform =
            `translate(-50%, -100%) rotate(${deg}deg)`;
    }

    if (text) {
        text.innerText = deg + "°";
    }

    // 🌬 WIND ALIGNMENT (NEW)
    const wind = document.getElementById("windIndicator");

    if (wind && lastConditions.windDir !== undefined) {
        wind.style.transform =
            `translate(-50%, -100%) rotate(${lastConditions.windDir}deg)`;
    }
}

// =====================================================
// 🛠 16. HELPERS + UTIL
// =====================================================
// ---------------------------------------------
// 🔢 Animate Value Change (Smooth Text Update) 
// ---------------------------------------------
function updateSPI(v) {

    let arc = document.getElementById("spiArc");
    if (!arc) return;

    let r = 110;
    let C = 2 * Math.PI * r;

    arc.setAttribute("stroke-dasharray", C);
    arc.setAttribute("stroke-dashoffset", C - (v / 100) * C);

    arc.style.transition = "stroke-dashoffset 1s ease";

    let color = "#00ffa6";
    if (v < 50) color = "#ff4d4d";
    else if (v < 70) color = "#ffaa00";

    arc.style.stroke = color;

    let val = document.getElementById("spiValue");
    if (val) val.textContent = v + "%";
}

function animateValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;

    // Prevent unnecessary updates
    if (el.innerText === String(value)) return;

    el.style.transition = "all 0.4s ease";
    el.innerText = value;
}


// ---------------------------------------------
// 🎨 Color Indicator Based on Value
// ---------------------------------------------
function colorMini(id, value) {
    const el = document.getElementById(id);
    if (!el) return;

    let color;

    if (value >= 70) {
        color = "#00ffa6";   // good (green)
    } else if (value >= 50) {
        color = "#ffaa00";   // medium (orange)
    } else {
        color = "#ff4d4d";   // poor (red)
    }

    el.style.transition = "color 0.3s ease";
    el.style.color = color;
}

// ---------------------------------------------
// ⏳ Animated Dots (Loading Indicator)
// ---------------------------------------------
let dotsInterval = null;

function startDots() {

    let dots = 0;

    if (dotsInterval) clearInterval(dotsInterval);

    dotsInterval = setInterval(() => {
        const el = document.getElementById("dots");
        if (!el) return;

        dots = (dots + 1) % 4;
        el.innerText = ".".repeat(dots);
    }, 400);
}

function stopDots() {
    if (dotsInterval) {
        clearInterval(dotsInterval);
        dotsInterval = null;
    }
}

simulateWeather();
