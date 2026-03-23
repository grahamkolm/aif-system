// =========================
// 🚀 AIF APP CONTROLLER
// =========================

// =========================
// GLOBAL STATE
// =========================

let lastSPI = null;
let lastWindSpeed = 0;
let lastCloud = 0;
let lastPressure = 0;

// =========================
// WEATHER CONFIG
// =========================

const WEATHER_URL =
"https://api.openweathermap.org/data/2.5/forecast?lat=-26.1&lon=28.0&appid=63ba514dc7c2242cb10cd2632d2569ad&units=metric";

// =========================
// FETCH WEATHER
// =========================

async function fetchWeatherSafe(){

    try{
        let res = await fetch(WEATHER_URL);
        let data = await res.json();
        processWeather(data);
    }catch(e){
        console.log("Offline → using fallback");
        simulateWeather();
    }

}

// =========================
// PROCESS WEATHER
// =========================

function processWeather(data){

    try{

        let current = data.list[0];

        renderDashboard(current);

    }catch(e){
        console.log("Weather parse error");
        simulateWeather();
    }

}

// =========================
// FALLBACK WEATHER
// =========================

function simulateWeather(){

    let fake = {
        main:{ temp:22, pressure:1018 },
        wind:{ speed:3, deg:180 },
        clouds:{ all:40 }
    };

    renderDashboard(fake);

}

// =========================
// CORE RENDER
// =========================

function renderDashboard(d){

let t = d.main.temp;
let p = d.main.pressure;
let w = d.wind.speed * 3.6;
let c = d.clouds.all;
let windDir = d.wind.deg;

// store
lastPressure = p;
lastWindSpeed = w;
lastCloud = c;

// =========================
// 🔥 SPI ENGINE CALL
// =========================

let spi = calculateSPI(p, w, c, windDir, t);

// smoothing
if(lastSPI !== null){
    spi = Math.round((spi + lastSPI) / 2); } lastSPI = spi;

// =========================
// UI UPDATE
// =========================

updateSPI(spi);
updateTiles(t, p, w, c);
updateConfidence(spi, p, c);
updateAI(spi, p, w, c, windDir, t);

}

// =========================
// SPI GAUGE
// =========================

function updateSPI(v){

let arc = document.getElementById("spiArc");
let r = 110;
let C = 2 * Math.PI * r;

arc.style.strokeDasharray = C;
arc.style.strokeDashoffset = C - (v/100) * C;

document.getElementById("spiValue").textContent = v + "%";

}

// =========================
// TILES
// =========================

function updateTiles(t, p, w, c){

setText("air", t.toFixed(1) + "°C");
setText("pressure", p + " hPa");
setText("wind", w.toFixed(1) + " km/h"); setText("cloud", c + "%");

// water temps from engine
let surface = estimateSurfaceTemp({
    prevWaterTemp: t - 0.5,
    airTemp: t,
    windSpeed: w,
    sunFactor: 1 - c/100,
    hour: new Date().getHours()
});

let bottom = estimateBottomTemp({
    surfaceTemp: surface,
    depth: 6,
    windSpeed: w
});

setText("surface", surface.toFixed(1) + "°C"); setText("bottom", bottom.toFixed(1) + "°C");

}

// =========================
// CONFIDENCE + ENV
// =========================

function updateConfidence(spi, p, c){

let env = Math.round((100 - Math.abs(p-1018)*2) + (c*0.2)); env = Math.max(40, Math.min(env,95));

let conf = Math.round((spi + env)/2);

setText("envScore", env + "%");
setText("confScore", conf + "%");

}

// =========================
// AI TEXT
// =========================

function updateAI(spi, p, w, c, windDir, t){

let trend = getPressureTrend(p);
let window = detectStrikeWindow(spi, trend, w, c); let duration = predictStrikeDuration(spi, trend, w, c);

let text =
`SPI: ${spi}%<br>
Trend: ${trend}<br>
Window: ${window}<br>
Duration: ${duration} min`;

document.getElementById("aiContent").innerHTML = text;

}

// =========================
// HELPERS
// =========================

function setText(id, value){
let el = document.getElementById(id);
if(el) el.innerText = value;
}

// =========================
// INIT
// =========================

function startSystem(){

fetchWeatherSafe();

setInterval(fetchWeatherSafe, 600000); // every 10 min

}

// =========================
// START
// =========================

document.addEventListener("DOMContentLoaded", startSystem);

// =========================
// 📊 REPORT SYSTEM (SAFE BLOCK)
// =========================

// ---------- DATA ----------
function getSessionData(){

let scouts = JSON.parse(localStorage.getItem("aif_scout") || "[]"); let drops = JSON.parse(localStorage.getItem("aif_drops") || "[]");

let bestScout = scouts.length
? scouts.reduce((a,b)=> a.score > b.score ? a : b)
: null;

let avgSPI = 0;
let validDrops = drops.filter(d => d.spi);

if(validDrops.length){
avgSPI = Math.round(
validDrops.reduce((sum,d)=> sum + Number(d.spi),0) / validDrops.length ); }

return {
scouts,
drops,
bestScout,
avgSPI
};

}

// ---------- OPEN REPORT ----------
function openReport(){

let existing = document.getElementById("reportScreen");
if(existing) existing.remove();

document.body.insertAdjacentHTML("beforeend", ` <div id="reportScreen" style="
position:fixed;
top:0;
left:0;
width:100%;
height:100%;
background:black;
color:white;
z-index:9999;
overflow:auto;
padding:20px;
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
cursor:pointer;
">Close</button>

<h2 style="color:#00ffa6;">AIF SESSION REPORT</h2>

<div id="reportSummary" style="margin-top:20px;"></div>

<div id="reportMap" style="
width:100%;
height:250px;
margin-top:15px;
border-radius:16px;
border:1px solid rgba(0,255,166,0.2);
overflow:hidden;
"></div>

<div id="reportMap" style="height:100%; width: 100%;"></div>

</div>
`);

renderReport();

}

// ---------- RENDER ----------
function renderReport(){

let {scouts, drops, bestScout, avgSPI} = getSessionData();

document.getElementById("reportSummary").innerHTML = ` <b>Scout Points:</b> ${scouts.length}<br> <b>Drops:</b> ${drops.length}<br> <b>Best Score:</b> ${bestScout ? bestScout.score : 0}%<br> <b>Avg SPI:</b> ${avgSPI}% `;

renderReportMap(scouts, drops, bestScout); renderDropList(drops);

}

// ---------- MAP ----------
function renderReportMap(scouts, drops, bestScout){

let center = scouts.length
? [scouts[0].boatLat, scouts[0].lon]
: [-26, 28];

let map = L.map('reportMap').setView(center, 15);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

window.reportMap = map;
setupTimeout(()=>{
if(window.reportMap){
reportMap.invaliddateSize();
}
},300);

// FIX MAP SIZE BUG
setTimeout(()=> map.invalidateSize(),200);

// SCOUTS
scouts.forEach(s=>{
L.circleMarker([s.boatLat, s.lon]).addTo(map); });

// DROPS
drops.forEach(d=>{
L.marker([d.boatLat, d.lon]).addTo(map); });

// BEST SPOT
if(bestScout){
L.marker([bestScout.boatLat, bestScout.lon]).addTo(map) .bindPopup("Best Spot"); }

}

// ---------- DROPS ----------
function renderDropList(drops){

let html = "";

drops.forEach((d,i)=>{
html += `
<div style="
background:#111;
padding:12px;
margin-top:10px;
border-radius:8px;
">
<b>Drop ${i+1}</b><br>
SPI: ${d.spi || "N/A"}<br>
Distance: ${d.distance || "N/A"} m
</div>
`;
});

document.getElementById("dropList").innerHTML = html;

}

function confirmDrop(){

navigator.geolocation.getCurrentPosition(function(pos){

let boatLat = pos.coords.latitude;
let boatLon = pos.coords.longitude;

let drops = JSON.parse(localStorage.getItem("aif_drops") || "[]");

drops.push({
boatLat: boatLat,
lon: boatLon,
time: Date.now(),
spi: lastSPI || 0   // ✅ THIS IS THE FIX
});

localStorage.setItem("aif_drops", JSON.stringify(drops));

alert("Drop logged successfully");

});
}

// ---------- CLOSE ----------
function closeReport(){
let el = document.getElementById("reportScreen");
if(el) el.remove();
}

