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

// ===============================
// 📊 DASHBOARD
// ===============================

function renderDashboard(d){

let t = d.main.temp;
let p = d.main.pressure;
let w = d.wind.speed * 3.6;
let c = d.clouds.all;
let windDir = d.wind.deg;

// 🔥 CALCULATE SPI FIRST
let spi = calculateSPI(p, w, c, windDir, t);

// smooth
if (lastSPI !== null) {
    spi = Math.round((spi + lastSPI) / 2); }

// store last SPI
lastSPI = spi;

// 🧠 STORE FULL CONDITIONS
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

// UI
updateSPI(spi);
updateTiles(t,p,w,c);
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
let window = detectStrikeWindow(spi,trend,w,c);
let duration = predictStrikeDuration(spi,trend,w,c);

document.getElementById("aiContent").innerHTML =
`SPI: ${spi}%<br>
Trend: ${trend}<br>
Window: ${window}<br>
Duration: ${duration} min`;

}

function set(id,val){
let el = document.getElementById(id);
if(el) el.innerText = val;
}

// ===============================
// 📊 REPORT SYSTEM (SESSION BASED)
// ===============================

function openReport(){

if(!currentSession) return;

document.body.insertAdjacentHTML("beforeend",`

<div id="reportScreen" style="
position:fixed;
top:0;
left:0;
width:100%;
height:100%;
background:black;
color:white;
z-index:9999;
padding:20px;
overflow:auto;
">

<button onclick="this.parentElement.remove()" style="position:fixed;top:20px;right:20px;">Close</button>

<h2 style="color:#00ffa6;">Session Report</h2>

<div id="reportSummary"></div>

<div id="reportMap" style="height:250px;margin-top:15px;border-radius:12px;"></div>

<div id="timeline"></div>

</div>
`);

renderReport();

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

renderMap(events);
renderTimeline(events);

}

// ===============================
// 🗺 MAP
// ===============================

function renderMap(events){

let map = L.map('reportMap').setView([-26,28],13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

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
}).addTo(map);

});

setTimeout(()=>map.invalidateSize(),300);

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
