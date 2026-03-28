// ===============================
// 🌍 GLOBAL STATE
// ===============================

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


// ===============================
// START SYSTEM
// ===============================

function startSystem(){
    navigator.geolocation.getCurrentPosition(pos => {

        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=63ba514dc7c2242cb10cd2632d2569ad&units=metric`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                renderDashboard(data.list[0]);
            });

    }, () => {
        simulateWeather();
    });
}

// ===============================
// INIT
// ===============================

document.addEventListener("DOMContentLoaded", () => {
    startSystem();

    if(typeof lucide !== "undefined"){
        lucide.createIcons();
        initGPS();
        initCompass();
    }
});

setTimeout(() => {
    const splash = document.getElementById("splash");
    if (splash) {
        splash.style.opacity = "0";
        splash.style.transition = "opacity 0.6s ease";

        setTimeout(() => {
            splash.remove();
        }, 600);
    }
}, 2000);


let dots = 0;
setInterval(() => {
    const el = document.getElementById("dots");
    if (!el) return; // ✅ prevents crash

    dots = (dots + 1) % 4;
    el.innerText = ".".repeat(dots);
}, 400);

// ===============================
// 🧠 SESSION SYSTEM
// ===============================

function initSession(){

    let sessions = JSON.parse(localStorage.getItem("aif_sessions") || "[]");

    let dam = prompt("Enter Dam Name:");
    let area = prompt("Enter Area / Peg:");

    currentSession = {
        id: Date.now(),
        dam: dam || "Unknown",
        area: area || "Unknown",
        date: new Date().toISOString(),
        events: []
    };

    sessions.push(currentSession);
    localStorage.setItem("aif_sessions", JSON.stringify(sessions));

}

// ===============================
// 🌦 WEATHER SYSTEM
// ===============================

function simulateWeather(){
    renderDashboard({
        main:{temp:22, pressure:1018},
        wind:{speed:3, deg:180},
        clouds:{all:40}
    });
}

// =============================
// WATER + ENVIRONMENT MODELS
// =============================

function estimateSurfaceTemp({ prevWaterTemp, airTemp, windSpeed, sunFactor, hour }) {

    let temp = prevWaterTemp;

    // air influence
    temp += (airTemp - temp) * 0.15;

    // sun heating (day only)
    if(hour >= 8 && hour <= 17){
        temp += sunFactor * 0.8;
    }

    // wind cooling
    temp -= windSpeed * 0.02;

    return temp;
}

function estimateBottomTemp({ surfaceTemp, depth, windSpeed }) {

    let gradient = depth * 0.15;

    // wind mixes layers
    gradient -= windSpeed * 0.05;

    return surfaceTemp - Math.max(gradient, 0.5); 
}

function estimateOxygen(temp, windSpeed){

    let oxygen = 9;

    // warm water = less oxygen
    oxygen -= (temp - 15) * 0.2;

    // wind adds oxygen
    oxygen += windSpeed * 0.1;

    return Math.max(5, Math.min(oxygen, 12)); 
}

// ===============================
// 📊 DASHBOARD
// ===============================

function renderDashboard(d){

// =========================
// 📥 GET DATA
// =========================
let t = d.main.temp;
let p = d.main.pressure;
let w = d.wind.speed;
let c = d.clouds.all;
let windDir = d.wind.deg;
    
// =========================
// 🌊 CALCULATE TEMPS
// =========================
let sunFactor = (100 - c) / 100;

let hour = new Date().getHours();

// Sun influence depends on time
let sunEffect = 0;

if(hour >= 10 && hour <= 16){
    sunEffect = sunFactor * 1.2;   // peak heating
} else if(hour >= 7 && hour < 10){
    sunEffect = sunFactor * 0.6;   // warming up
} else {
    sunEffect = 0.2;               // minimal effect
}

// Wind cooling reduced slightly
let windCooling = w * 0.15;

// FINAL surface temp
let surfaceTemp = t + sunEffect - windCooling;

let mixingFactor = Math.min(1, w / 5);
let depthDrop = 0.5 + (1 - mixingFactor) * 1.2;

let bottomTemp = surfaceTemp - depthDrop;

// =========================
// 🛟 SAFETY (FIXED SCOPE)
// =========================
if (surfaceTemp === undefined || bottomTemp === undefined) {
    console.log("Temps fallback triggered");

    surfaceTemp = t;
    bottomTemp = t - 1.5;
    }

    // =========================
    // 📏 LIMITS
    // =========================
    surfaceTemp = Math.max(5, Math.min(35, surfaceTemp));
    bottomTemp = Math.max(4, Math.min(surfaceTemp - 0.3, bottomTemp));

    // =========================
    // 🎨 COLOR FUNCTION
    // =========================
    function getTempColor(temp){
        if(temp >= 18 && temp <= 24) return "#00ffa6";
        if((temp >= 14 && temp < 18) || (temp > 24 && temp <= 28)) return "#ffaa00";
        return "#ff4d4d";
    }

    // =========================
    // 🖥 UPDATE UI (ALWAYS RUNS NOW ✅)
    // =========================
    let airEl = document.getElementById("air");
    if(airEl){
        airEl.innerHTML = t.toFixed(1) + "°C";
        airEl.style.color = getTempColor(t);
    }

    let surfaceEl = document.getElementById("surface");
    if(surfaceEl){
        surfaceEl.innerHTML = surfaceTemp.toFixed(1) + "°C";
        surfaceEl.style.color = getTempColor(surfaceTemp);
    }

let bottomEl = document.getElementById("bottom");
if(bottomEl){
    bottomEl.innerHTML = bottomTemp.toFixed(1) + "°C";
    bottomEl.style.color = getTempColor(bottomTemp);
}

// =========================
// 💨 OXYGEN
// =========================
let oxygen = estimateOxygen(surfaceTemp, w);

// =========================
// 📦 STORE CONDITIONS
// =========================
lastConditions = {
    airTemp: t,
    pressure: p,
    windSpeed: w,
    windDir: windDir,
    cloud: c,
    moon: getMoonPhase(),
    season: getSeason(),
    trend: getPressureTrend(p)
};

// =========================
// 🎯 CALCULATE SPI
// =========================
let spi = calculateSPI(p, w, c, windDir, t);

if(lastSPI !== null){
    spi = Math.round((spi + lastSPI) / 2);
}
lastSPI = spi;

let trend = getPressureTrend(p);

if(trend === "Falling") spi += 10;
if(trend === "Rising") spi -= 5;

if(w > 8 && w < 20) spi += 5;
if(w < 2) spi -= 5;

spi = Math.max(0, Math.min(100, spi));
    
let envScore = 0;

if(t >= 18 && t <= 24) envScore += 30;
else if(t >= 15 && t <= 28) envScore += 20;
else envScore += 10;

if(c >= 20 && c <= 60) envScore += 25;
else if(c < 20) envScore += 15;
else envScore += 10;

if(w >= 5 && w <= 15) envScore += 25;
else if(w < 5) envScore += 15;
else envScore += 10;

let oxygenFactor = (w * 0.5) - (t - 20);
envScore += Math.max(0, Math.min(20, oxygenFactor + 10));

envScore = Math.round(Math.min(100, envScore));

function calculateSPI(p, w, c, windDir, t){
    let score = 50;

    if(p > 1015) score += 10;
    if(w > 5) score += 10;
    if(c > 30) score += 10;
    if(t >= 18 && t <= 24) score += 20;

    return Math.min(100, score);
}
   
// 🎯 CONFIDENCE
let stability = 0;

if(trend === "Stable") stability += 20;
if(trend === "Falling") stability += 15;
if(trend === "Rising") stability += 10;

if(w > 3 && w < 15) stability += 20;

if(t >= 18 && t <= 24) stability += 20;

let agreement = 100 - Math.abs(envScore - spi);

let confScore = Math.round((stability * 0.5) + (agreement * 0.5));
confScore = Math.min(100, confScore);

// =========================
// 🧾 UPDATE TEXT VALUES
// =========================
set("envScore", envScore + "%");
set("confScore", confScore + "%");
updateTactical(spi, envScore, confScore, w, t);
set("pressure", p + " hPa");
set("wind", w.toFixed(1) + " km/h");
set("cloud", c + "%");
set("oxygen", oxygen.toFixed(1) + " mg/L");
set("moon", getMoonPhase());
set("season", getSeason());
set("feed", feeding(spi));

// =========================
// 📊 VISUALS
// =========================
updateSPI(spi);
updateAI(spi,p,w,c);
updateBackground(spi);
    
}

function applyScout(){
  lastConditions.scout = selected;
  document.getElementById("scoutScreen").classList.add("hidden");
}

// ===============================
// 🌦 TACTICAL SYSTEM
// ===============================

function updateTactical(spi, envScore, confScore, w, t){

    let lines = [];

if(spi > 75){
    lines.unshift("🔥 PRIORITY: Stay on current spot — feeding window active"); } else if(spi < 50){
    lines.unshift("⚠️ PRIORITY: Relocate or change depth"); }
    
if(lastConditions.scout){

  if(lastConditions.scout.bubbles){
    lines.push("🎯 Fish actively feeding in area");
  }

  if(lastConditions.scout.rolling){
    lines.push("🐟 Fish showing — strong indication of presence");
  }

  if(lastConditions.scout.murky){
    lines.push("🌫 Low visibility — fish relying on scent");
  }

  if(lastConditions.scout.windBank){
    lines.push("🌬 Wind pushing food — target this bank");
  }

}
    
    // 🎯 SPI CORE
    if(spi > 85){
        lines.push("🔥 Peak feeding window active");
    } else if(spi > 70){
        lines.push("⚡ Good feeding conditions");
    } else {
        lines.push("⚠️ Low feeding activity");
    }

    // 🌿 ENVIRONMENT
    if(envScore > 75){
        lines.push("🌿 Environment stable and supportive");
    } else if(envScore < 50){
        lines.push("🌧️ Environmental pressure affecting fish");
    }

    if(confScore > 80){
    lines.push("🧠 High confidence pattern detected"); } else if(confScore < 50){
    lines.push("⚠️ Low confidence — conditions unstable"); 
    } 
    
    // 🌬️ WIND
    if(w < 5){
        lines.push("🌬️ Light wind — slower movement zones");
    } else if(w > 15){
        lines.push("🌊 Strong wind — target windblown banks");
    }

    // 🌡️ TEMP
    if(t >= 18 && t <= 24){
        lines.push("🌡️ Optimal temperature range for feeding");
    } else {
        lines.push("🌡️ Suboptimal temperature — adjust depth");
    }

    if(probeData){
    surfaceTemp = probeData.surface;
    bottomTemp = probeData.bottom;
    }

    // 🧠 FINAL OUTPUT
    document.getElementById("tactical").innerHTML = lines.join(" • "); }

 // ===============================
// 🎯 EVENT LOGGER (CORE SYSTEM)
// ===============================

function logEvent(type, extra = {}){

    if(!currentSession) return;

    navigator.geolocation.getCurrentPosition(pos => {

        let event = {
            type: type,
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            time: Date.now(),
            spi: lastSPI || 0,
            conditions: lastConditions,
            ...extra
        };

        currentSession.events.push(event);

        let sessions = JSON.parse(localStorage.getItem("aif_sessions") || "[]");

        let index = sessions.findIndex(s => s.id === currentSession.id);
        if(index !== -1){
            sessions[index] = currentSession;
        }

        localStorage.setItem("aif_sessions", JSON.stringify(sessions));

        console.log(type + " logged");

    });
}

// ===============================
// 🎯 REFRESH
// ===============================

function refreshData() {
    const icon = document.getElementById("refreshIcon");

    if (icon) {
        icon.classList.add("refresh-spin");
    }

    fetchWeatherSafe();
}
  
// ===============================
// 🎯 DROP / SCOUT / ESP / CATCH
// ===============================

function dropPoint() {
    if (!map) {
        console.log("Map not ready");
        return;
    }

    navigator.geolocation.getCurrentPosition(position => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        console.log("Dropped at:", lat, lon);

        L.marker([lat, lon]).addTo(map);

    }, err => {
        console.log("GPS error:", err);
    });
}

function ensureSession(){

    if(currentSession){
        return; // ✅ already exists → do nothing
    }

    // try load from storage first
    let saved = localStorage.getItem("aif_current_session");

    if(saved){
        currentSession = JSON.parse(saved);
        return;
    }

    // only ask ONCE
    let dam = prompt("Enter Dam Name:");
    let area = prompt("Enter Area / Peg:");

    currentSession = {
        id: Date.now(),
        dam: dam || "Unknown",
        area: area || "Unknown",
        date: new Date().toISOString(),
        events: []
    };

    localStorage.setItem("aif_current_session", JSON.stringify(currentSession)); }

function performScout(){
    logEvent("scout");
}

// 🔴 FUTURE READY
function logCatch(){
    logEvent("catch", {
        weight: prompt("Enter fish weight (kg):"),
        bait: prompt("Bait used:")
    });
}

function openScout(){
    ensureSession();
    logEvent ("scout");

document.body.insertAdjacentHTML("beforeend", `
<div id="scoutScreen" style="
position:fixed;
top:0; left:0;
width:100%; height:100%;
background:#05080d;
color:white;
z-index:999;
padding:20px;
font-family:Arial;
overflow:auto;
">

<h2 style="color:#00ffa6;">Scout Mode</h2>

<p style="opacity:0.7;">Quickly log activity & scan water</p>

<div style="margin-top:20px;display:flex;flex-wrap:wrap;gap:10px;">

<div style="margin-top:20px;display:flex;flex-direction:column;gap:15px;">

<div class="scout-group">
  <h3>Fish Activity</h3>
  <div class="scout-grid">
    <div class="scout-option" onclick="toggleScout('bubbles', this)">🫧 Bubbles</div>
    <div class="scout-option" onclick="toggleScout('rolling', this)">🐟 Rolling Fish</div>
    <div class="scout-option" onclick="toggleScout('none', this)">🚫 No Activity</div>
  </div>
</div>

<div class="scout-group">
  <h3>Water Clarity</h3>
  <div class="scout-grid">
    <div class="scout-option" onclick="toggleScout('clear', this)">💧 Clear</div>
    <div class="scout-option" onclick="toggleScout('stained', this)">🌤 Slightly Stained</div>
    <div class="scout-option" onclick="toggleScout('murky', this)">🌫 Murky</div>
  </div>
</div>

<div class="scout-group">
  <h3>Life Signs</h3>
  <div class="scout-grid">
    <div class="scout-option" onclick="toggleScout('birds', this)">🕊 Birds Active</div>
    <div class="scout-option" onclick="toggleScout('noBirds', this)">❌ No Birds</div>
  </div>
</div>

<div class="scout-group">
  <h3>Structure</h3>
  <div class="scout-grid">
    <div class="scout-option" onclick="toggleScout('weed', this)">🌿 Weed</div>
    <div class="scout-option" onclick="toggleScout('drop', this)">📉 Drop-off</div>
    <div class="scout-option" onclick="toggleScout('flat', this)">🏞 Flat</div>
  </div>
</div>

<div class="scout-group">
  <h3>Wind Effect</h3>
  <div class="scout-grid">
    <div class="scout-option" onclick="toggleScout('windBank', this)">🌬 Windblown Bank</div>
    <div class="scout-option" onclick="toggleScout('calm', this)">🪶 Calm Water</div>
  </div>
</div>

</div>

<button onclick="saveScout()" style="
position:sticky;
bottom:20px;
margin-top:25px;
width:100%;
padding:14px;
background:#00ffa6;
border:none;
border-radius:10px;
font-weight:bold;
z-index:10;
">
Save & Continue
</button>

<div id="scanArea" style="margin-top:20px;"></div>

</div>
`);
}

function toggleScout(type, el){

    selected[type] = !selected[type];

    if(selected[type]){
        el.classList.add("active"); 
    } else {
        el.classList.remove("active");
    }
}

// ===============================
// 🔍 SCOUT SCAN FLOW (FINAL CLEAN)
// ===============================

// store selections (make sure this exists once in your file) let selected = {};

// START SCAN (animation flow)
function startScan(){

    const resultBox = document.getElementById("scanArea");

    resultBox.innerHTML = "🔄 Checking sensors...";

    setTimeout(() => {

        const sensors = checkSensors();

        if(!sensors.temp && !sensors.turbidity && !sensors.depth){

            resultBox.innerHTML = `
❌ No sensors detected<br><br>

<button onclick="retryScan()" style="
width:100%;
padding:14px;
margin-top:10px;
background:#ffaa00;
border:none;
border-radius:10px;
font-weight:bold;
">
Retry
</button>

<button onclick="closeScout()" style="
width:100%;
padding:14px;
margin-top:10px;
background:#444;
border:none;
border-radius:10px;
color:white;
">
Exit
</button>
            `;

            return; // 🚨 STOP HERE
        }

        // ✅ sensors found → continue
        runScanFlow();

    }, 1000);
}

function retryScan(){
    startScan(); // 🔁 just re-run everything 
}

function runScanFlow(){

    const resultBox = document.getElementById("scanArea");

    resultBox.innerHTML = "📡 Sensors connected...";

    setTimeout(() => {
        resultBox.innerHTML = "🌊 Scanning water...";
    }, 1000);

    setTimeout(() => {
        resultBox.innerHTML = "🧠 Processing data...";
    }, 2000);

    setTimeout(() => {
        generateScoutResults(); // ✅ always ends flow
    }, 3000);
}

function checkSensors(){

    // 🔌 YOU CONTROL THIS LATER WITH REAL HARDWARE
    let tempSensor = false;
    let turbiditySensor = false;
    let depthSensor = false;

    return {
        temp: tempSensor,
        turbidity: turbiditySensor,
        depth: depthSensor
    };
}
    
// ===============================
// 📊 SCOUT RESULTS ENGINE
// ===============================
function applyScoutAndClose(score){

    lastConditions.scout = scoutInputs;
    lastConditions.scoutScore = score;

    document.getElementById("scoutScreen").remove();

    fetchWeatherSafe();
}

function saveScoutData(score){

    let entry = {
        time: Date.now(),
        inputs: scoutInputs,
        probe: probeData,
        score: score,
        conditions: lastConditions,
        spi: lastSPI
    };

    scoutHistory.push(entry);
    localStorage.setItem("aif_scout_history", JSON.stringify(scoutHistory)); }

function saveScout() {
    scoutInputs = { ...selected};
    scoutStep = "connect";
    showConnectionStatus();
}

function showConnectionStatus(){

    const box = document.getElementById("scanArea");

    // 🔌 SENSOR STATES
    let probe = false;
    let turbidity = false;
    let depth = true; // ← for testing

    // ✅ BUILD UI
    box.innerHTML = `
<b>Device Status</b><br><br>

Probe: ${probe ? "✅ Connected" : "❌ Not Connected"}<br>
Turbidity: ${turbidity ? "✅ Connected" : "❌ Not Connected"}<br>
Depth: ${depth ? "✅ Connected" : "❌ Not Connected"}<br><br>

<button onclick="showConnectionStatus()">Recheck Devices</button>

<button onclick="startScan()" id="startScanBtn">Start Scan</button> `;

    // ✅ ADD THIS HERE (VERY IMPORTANT POSITION)
    const anyConnected = probe || turbidity || depth;

    const btn = document.getElementById("startScanBtn");

    if(btn && !anyConnected){
        btn.disabled = true;
        btn.style.opacity = 0.5;
    }
}

//=====================================
//STEP 8 — RESULTS UI
//=====================================
function showResults(score){

document.getElementById("scanArea").innerHTML = `
<h3 style="color:#00ffa6;">Results</h3>

Surface: ${probeData.surface.toFixed(1)}°C<br>
Bottom: ${probeData.bottom.toFixed(1)}°C<br>
${probeData.thermo}<br><br>

Fishing Score: ${score}%<br>

<button onclick="closeScout()" style="
margin-top:20px;
width:100%;
padding:12px;
background:#00ffa6;
border:none;
border-radius:10px;
">
Apply & Close
</button>
`;
}

//=====================================
//STEP 9 — CLOSE + APPLY
//=====================================
function closeScout(){
document.getElementById("scoutScreen").remove();
fetchWeatherSafe();
}


// ===============================
// 📊 UI UPDATE
// ===============================

function updateSPI(v){
let arc = document.getElementById("spiArc");
if(!arc) return;

let r=110; let C=2*Math.PI*r;
arc.style.strokeDasharray=C;
arc.style.strokeDashoffset=C-(v/100)*C;

document.getElementById("spiValue").textContent=v+"%";
}

function updateAI(spi,p,w,c){

let trend = getPressureTrend(p);
let windowText = detectStrikeWindow(spi, trend, w, c); let duration = predictStrikeDuration(spi, trend, w, c); 

document.getElementById("aiAnalysis").innerHTML = `
SPI: ${spi}%
Trend: ${trend}
Window: ${windowText}
Duration: ${duration} min
`;
}  // ✅ CLOSE updateAI HERE

function openAIDetail(){

document.body.insertAdjacentHTML("beforeend", ` <div id="aiDetail" style="
position:fixed;
top:0; left:0;
width:100%; height:100%;
background:#05080d;
color:white;
z-index:999;
padding:20px;
overflow:auto;
">

<h2 style="color:#00ffa6;">AI Breakdown</h2>

<div style="margin-top:15px;line-height:1.6">

<b>Environment</b><br>
Temp: ${lastConditions.airTemp?.toFixed(1)}°C<br>
Wind: ${lastConditions.windSpeed} km/h<br>
Cloud: ${lastConditions.cloud}%<br><br>

<b>Pressure</b><br>
Trend: ${getPressureTrend(lastConditions.pressure)}<br><br>

<b>AI Insight</b><br>
${document.getElementById("tactical").innerText}

</div>

<button onclick="closeAIDetail()" style="
margin-top:20px;
width:100%;
padding:14px;
background:#00ffa6;
border:none;
border-radius:10px;
font-weight:bold;
">
Close
</button>

</div>
`);
}

function closeAIDetail(){
    document.getElementById("aiDetail").remove();
}
    
// ===============================
// 🛠 GLOBAL SET FUNCTION
// ===============================
function set(id,val){
let el = document.getElementById(id);
if(el) el.innerHTML = val;
}

// ===============================
// 📊 REPORT SYSTEM (SESSION BASED)
// ===============================

function openReport(){

if(!currentSession) return;

let events = currentSession.events;

// BUILD TIMELINE
let timelineHTML = "";

// CREATE SCREEN
document.body.insertAdjacentHTML("beforeend", ` <div id="reportScreen" style="
position:fixed;
top:0;
left:0;
width:100%;
height:100%;
background:#05080d;
color:white;
z-index:999;
overflow:auto;
padding:20px;
font-family:Arial;
">

<button onclick="closeReport()" style="
position:fixed;
top:20px;
right:20px;
background:#00ffa6;
color:#081018;
border:none;
padding:10px 16px;
border-radius:8px;
font-weight:600;
">Close</button>

<h2 style="color:#00ffa6;">AIF SESSION REPORT</h2>

<div id="reportSummary"></div>

<h3 style="margin-top:20px;color:#00ffa6;">Timeline</h3>
<div id="timeline"></div>

<h3 style="margin-top:20px;color:#00ffa6;">Session Map</h3> <div id="reportMap" style="height:220px;border-radius:12px;"></div>

</div>
`);

// ✅ INSERT TIMELINE (FIXED)
document.getElementById("timeline").innerHTML = timelineHTML;

// CONTINUE
renderReport();
}

function closeReport(){
    let el = document.getElementById("reportScreen");
    if(el) el.remove();
}

// ===============================
// 📊 REPORT CONTENT
// ===============================

function renderReport(){

let events = currentSession.events;

let drops = events.filter(e=>e.type==="drop");
let scouts = events.filter(e=>e.type==="scout");
let catches = events.filter(e=>e.type==="catch");

let avgSPI = Math.round(drops.reduce((s,d)=>s+d.spi,0)/drops.length); 

document.getElementById("reportSummary").innerHTML += ` 
<br><br>
${generateInsights(drops, scouts, catches)}
Dam: ${currentSession.dam}<br>
Area: ${currentSession.area}<br>
Drops: ${drops.length}<br>
Scouts: ${scouts.length}<br>
Fish: ${catches.length}<br>
Avg SPI: ${avgSPI}%
`;

renderTimeline(events);
renderMap(events);
}

setTimeout(() => {
    if(window.reportMap && typeof window.reportMap.invalidateSize == "function") {
    window.reportMap.invalidateSize();
    window.reportMap.setView([-26,28],13);
}
},300);

// ===============================
// 🗺 MAP
// ===============================

let map;

window.openMap = function () {

    const mapScreen = document.getElementById("mapScreen");
    mapScreen.style.display = "block";

    if (!window.mapInitialized) {
        map = L.map('map').setView([-26, 28], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        window.mapInitialized = true;
    }

    setTimeout(() => {
        if (map) map.invalidateSize();
    }, 300);
};

function closeMap(){
    document.getElementById("mapScreen").style.display = "none";
}

function renderMap(events){

// 🔥 remove old map
if(window.reportMap){
    window.reportMap.remove();
}

window.reportMap = L.map('reportMap').setView([-26,28],13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(window.reportMap);

events.forEach(e => {

let color = "blue";

if(e.type==="scout") color="yellow";
if(e.type==="drop") color="green";
if(e.type==="catch") color="red";

L.circleMarker([e.lat,e.lon],{
radius:6,
color:color,
fillColor:color,
fillOpacity:0.8
}).addTo(window.reportMap);

});

// 🔥 force correct size
setTimeout(()=>{
    window.reportMap.invalidateSize();
},200);

}

// ===============================
// 📋 TIMELINE
// ===============================

function renderTimeline(events){

    let html = "<h3>Timeline</h3>";

    events.forEach(e => {
        html += `
        <div style="margin-top:10px">
        ${new Date(e.time).toLocaleTimeString()} • ${e.type.toUpperCase()} • SPI ${e.spi}%
        </div>`;
    });

    document.getElementById("timeline").innerHTML = html; 
}

function feeding(spi){

if(spi >= 85) return "Aggressive feeding"; 
if(spi >= 70) return "Active feeding"; 
if(spi >= 55) return "Moderate feeding"; 
if(spi >= 40) return "Slow feeding";

return "Very low activity";
}

function getSeason(){
let month = new Date().getMonth() + 1; 
if(month >= 12 || month <= 2) return "Summer"; 
if(month >= 3 && month <= 5) return "Autumn"; 
if(month >= 6 && month <= 8) return "Winter"; 
return "Spring"; 
}

function getMoonPhase(){
return "Waning"; // placeholder (we upgrade later) 
}

function getPressureTrend(p){
    if(lastPressure === null){
        lastPressure = p;
        return "Stable";
}

    let diff = p - lastPressure;
    lastPressure = p;

    if(diff > 1) return "Rising";
    if(diff < -1) return "Falling";
    return "Stable";
}

function generateInsights(drops, scouts, catches){

let text = "";

// Drop analysis
if (drops.length > 0) {

    let avgSPI = Math.round(drops.reduce((s, d) => s + d.spi, 0) / drops.length);

    if (avgSPI >= 80) {
        text += "🔥 High confidence feeding zone detected.<br>";
    } else if (avgSPI >= 60) {
        text += "⚡ Moderate feeding activity observed.<br>";
    } else {
        text += "⚠️ Low feeding activity.<br>";
    }

    // Activity insight
    if (drops.length > scouts.length) {
        text += "🎯 Strong commitment to productive spots.<br>";
    } else {
        text += "🧭 More scouting recommended before drops.<br>";
    }

    // Catch logic
    if (catches.length > 0) {
        text += "🎣 Successful session – pattern confirmation likely.<br>";
    } else {
        text += "📉 No catches recorded – refine timing or location.<br>";
    }

}

return text;
}

function updateBackground(spi){
  document.body.classList.remove("low","medium","high");

  if(spi > 80){
    document.body.classList.add("high");
  } else if(spi > 60){
    document.body.classList.add("medium");
  } else {
    document.body.classList.add("low");
  }
}

setTimeout(() => {
if (window.lucide) {
    lucide.createIcons();
}
}, 100);

window.confirmDrop = function () {

    ensureSession();

    if (!map) {
        alert("Open map first");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        pos => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;

            L.marker([lat, lon]).addTo(map);
            logEvent("drop", { lat, lon });

            console.log("Dropped at:", lat, lon);
        },
        err => {
            alert("GPS failed: " + err.message);
            console.log("GPS error:", err);
        }
    );
};

//====================
// GPS (REAL LOCATION)
//====================

function initGPS(){
    if(!navigator.geolocation) return;

    navigator.geolocation.watchPosition(pos => {
        userLocation = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude
        };

        if(map){
            map.setView([userLocation.lat, userLocation.lon], 15);
        }

    }, err => {
        console.log("GPS error", err);
    }, {
        enableHighAccuracy: true
    });
}

//====================
// COMPASS
//====================


function initCompass(){

    window.addEventListener("deviceorientationabsolute", (e) => {

        if(e.alpha !== null){
            compassHeading = Math.round(e.alpha);

            let el = document.getElementById("compassValue");
            if(el){
                el.innerText = compassHeading + "°";
            }
        }

    }, true);
}

//====================
// PLAN SYSTEM
//====================

function openPlan(){

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


function togglePlan(type, el){

    planSelections[type] = !planSelections[type];

    if(planSelections[type]){
        el.classList.add("active");
    } else {
        el.classList.remove("active");
    }
}


function calculatePlanScore(){

    let score = 50;

    if(planSelections.windBank) score += 10;
    if(planSelections.activity) score += 15;
    if(planSelections.noActivity) score -= 10;

    if(planSelections.boilie) score += 8;
    if(planSelections.popup) score += 5;

    if(planSelections.stay) score += 5;
    if(planSelections.move) score -= 5;

    return Math.max(0, Math.min(100, score));
}


function applyPlan(){

    planScore = calculatePlanScore();

    lastConditions.plan = planSelections;
    lastConditions.planScore = planScore;

    let currentConf = parseInt(document.getElementById("confScore").innerText) || 50;

    let newConf = Math.round((currentConf + planScore) / 2);

    set("confScore", newConf + "%");

    updateTactical(lastSPI, parseInt(document.getElementById("envScore").innerText), newConf, lastConditions.windSpeed, lastConditions.airTemp);

    document.getElementById("planScreen").remove();
}

//====================
// BACKGROUND CALC
//====================

const canvas = document.getElementById("aifCanvas");
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

let SPI = 70;

let bubbles = [];
function spawnBubble(){
  bubbles.push({
    x: canvas.width*0.4 + Math.random()*canvas.width*0.2,
    y: canvas.height*0.9,
    size: Math.random()*3+1,
    speed: Math.random()*1.2+0.5,
    drift: Math.random()-0.5,
    alpha: 0.15 + Math.random()*0.15
  });
}

let ripples = [];
function ripple(){
  ripples.push({
    r:0,
    alpha:0.25,
    x:canvas.width/2,
    y:canvas.height*0.7
  });
}
setInterval(ripple, 3000);

let angle = 0;

function drawThermocline(){
  let y = canvas.height * 0.45;

  let gradient = ctx.createLinearGradient(0, y-20, 0, y+20);
  gradient.addColorStop(0, "rgba(255,200,0,0)");
  gradient.addColorStop(0.5, "rgba(255,200,0,0.25)");
  gradient.addColorStop(1, "rgba(255,200,0,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, y-20, canvas.width, 40);
}

function animate(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  drawThermocline();

  if(Math.random() < SPI/100 * 0.15){
    spawnBubble();
  }

  bubbles.forEach((b,i)=>{
    b.y -= b.speed;
    b.x += b.drift;

    ctx.fillStyle = `rgba(200,255,230,${b.alpha})`;
    ctx.beginPath();
    ctx.arc(b.x,b.y,b.size,0,Math.PI*2);
    ctx.fill();

    if(b.y < 0) bubbles.splice(i,1);
  });

  angle += 0.02;
  ctx.save();
  ctx.translate(canvas.width/2, canvas.height/2);

  ctx.strokeStyle = "rgba(0,255,163,0.05)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0,0,200,angle,angle+0.5);
  ctx.stroke();

  ctx.restore();

  ripples.forEach((r,i)=>{
    r.r += 2;
    r.alpha *= 0.96;

    ctx.strokeStyle = `rgba(0,255,163,${r.alpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(r.x,r.y,r.r,0,Math.PI*2);
    ctx.stroke();

    if(r.alpha < 0.01) ripples.splice(i,1);
  });

  requestAnimationFrame(animate);
}

animate();

