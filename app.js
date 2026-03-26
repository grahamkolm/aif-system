// ===============================
// 🌍 GLOBAL STATE
// ===============================

let currentSession = null; 
let lastSPI = null;
let lastConditions = {};
let lastPressure = null;

// ===============================
// 🚀 START SYSTEM
// ===============================

document.addEventListener("DOMContentLoaded", () => {
    initSession();
    startSystem();
    if(typeof lucide !== "undefined"){
        lucide.createIcons();
    }
});

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

const WEATHER_URL = "https://api.openweathermap.org/data/2.5/forecast?lat=-26.1&lon=28.0&appid=63ba514dc7c2242cb10cd2632d2569ad&units=metric";

async function startSystem(){
    fetchWeatherSafe();
    setInterval(fetchWeatherSafe, 600000); 
}

function fetchWeatherSafe() {

    const icon = document.getElementById("refreshIcon");

    fetch(WEATHER_URL)
        .then(res => res.json())
        .then(data => {
            renderDashboard(data.list[0]);

            // STOP SPIN HERE (REAL FINISH)
            icon.classList.remove("refresh-spin");
        })
        .catch(() => {
            simulateWeather();
            icon.classList.remove("refresh-spin");
        });
}

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

// ===============================
// 🌦 TACTICAL SYSTEM
// ===============================

function updateTactical(spi, envScore, confScore, w, t){

    let lines = [];

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

        alert(type.toUpperCase() + " logged");

    });
}

// ===============================
// 🎯 REFRESH
// ===============================

function refreshData() {

    const icon = document.getElementById("refreshIcon");
    if(icon){
        icon.classList.remove("refresh-spin");
    }
    
    // START SPIN
    icon.classList.add("refresh-spin");

    // CALL YOUR WEATHER / UPDATE FUNCTION
    fetchWeatherSafe();

    // STOP SPIN AFTER DONE
    setTimeout(() => {
        icon.classList.remove("refresh-spin");
    }, 1200); // adjust timing if needed 
}

// ===============================
// 🎯 DROP / SCOUT / CATCH
// ===============================

function confirmDrop(){
    logEvent("drop");
}

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

events.forEach(e=>{
html += `
<div style="margin-top:10px">
${new Date(e.time).toLocaleTimeString()} • ${e.type.toUpperCase()} • SPI ${e.spi}% </div>`; });

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
