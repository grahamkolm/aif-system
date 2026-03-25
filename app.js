// ===============================
// 🌍 GLOBAL STATE
// ===============================

let currentSession = null;
let lastSPI = null;
let lastConditions = {};

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
    setInterval(fetchWeatherSafe, 600000); }

async function fetchWeatherSafe(){
    try{
        let res = await fetch(WEATHER_URL); 
        let data = await res.json();
        renderDashboard(data.list[0]);
    }catch{
        simulateWeather();
    }
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

    return surfaceTemp - Math.max(gradient, 0.5); }

function estimateOxygen(temp, windSpeed){

    let oxygen = 9;

    // warm water = less oxygen
    oxygen -= (temp - 15) * 0.2;

    // wind adds oxygen
    oxygen += windSpeed * 0.1;

    return Math.max(5, Math.min(oxygen, 12)); }

// ===============================
// 📊 DASHBOARD
// ===============================

function renderDashboard(d){

let t = d.main.temp;
let p = d.main.pressure;
let w = d.wind.speed * 3.6;
let c = d.clouds.all;
let windDir = d.wind.deg;

// ✅ CALCULATE WATER FIRST
let surfaceTemp = estimateSurfaceTemp({
    prevWaterTemp: lastSurfaceTemp || (t - 0.5),
    airTemp: t,
    windSpeed: w || 2,
    sunFactor: 1 - (c || 0) / 100,
    hour: new Date().getHours()
});

let bottomTemp = estimateBottomTemp({
    surfaceTemp: surfaceTemp,
    depth: 6,
    windSpeed: w
});

let oxygen = estimateOxygen(surfaceTemp, w);

lastSurfaceTemp = surfaceTemp;
    
// ✅ STORE CONDITIONS
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

// ✅ CALCULATE SPI
let spi = calculateSPI(p, w, c, windDir, t);

if(lastSPI !== null){
    spi = Math.round((spi + lastSPI) / 2); } lastSPI = spi;    
    
let envScore = Math.round((100 - c) * 0.4 + (20 - Math.abs(t - 20)) * 3 + (10 - w) * 3); 
envScore = Math.max(0, Math.min(100, envScore));

let confScore = Math.round((spi * 0.7) + (envScore * 0.3));

set("ENV", envScore + "%");
set("CONF", confScore + "%");
    
// ✅ UPDATE UI (AFTER EVERYTHING EXISTS) 
set("air", t.toFixed(1) + "°C"); 
set("pressure", p + " hPa"); 
set("wind", w.toFixed(1) + " km/h"); 
set("cloud", c + "%");
set("surfaceTemp", surfaceTemp.toFixed(1) + "°C"); 
set("bottomTemp", bottomTemp.toFixed(1) + "°C"); 
set("oxygen", oxygen.toFixed(1) + " mg/L");
set("moon", getMoonPhase());
set("season", getSeason());
set("feed", feeding(spi));

// SPI + AI
updateSPI(spi);
updateAI(spi,p,w,c);
}

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

function updateTiles(t,p,w,c){
set("air",t.toFixed(1)+"°C");
set("pressure",p+" hPa");
set("wind",w.toFixed(1)+" km/h");
set("cloud",c+"%");
set("moon", getMoonPhase());
set("season", getSeason());
set("feed", feeding(lastSPI || 0));
set("oxygen", estimateOxygen(t,w,c).toFixed(1));
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

let avgSPI = drops.length ? Math.round(drops.reduce((s,d)=>s+d.spi,0)/drops.length) : 0;

document.getElementById("reportSummary").innerHTML = `
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

setTimeout(()=>{
window.reportMap.invalidateSize(),
window.reportMap.setView([-26,28],13);
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
return "Stable"; // placeholder (we upgrade later) 
}

function generateInsights(drops, scouts, catches){

let text = "";

// Drop analysis
if(drops.length > 0){
let avgSPI = Math.round(drops.reduce((s,d)=>s+d.spi,0)/drops.length);

if(avgSPI >= 80){
text += "🔥 High confidence feeding zone detected.<br>"; }else if(avgSPI >= 60){ text += "⚡ Moderate feeding activity observed.<br>"; }else{ text += "⚠️ Low feeding conditions during session.<br>"; } }

// Activity insight
if(drops.length > scouts.length){
text += "🎯 Strong commitment to productive spots.<br>"; }else{ text += "🧭 More scouting recommended before drops.<br>"; }

// Catch logic
if(catches.length > 0){
text += "🎣 Successful session — pattern confirmation likely.<br>"; }else{ text += "📉 No catches recorded — refine timing or bait.<br>"; }

return text;
}

setTimeout(() => {
if (window.lucide) {
    lucide.createIcons();
}
}, 100);
