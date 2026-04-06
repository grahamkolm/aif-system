// =====================================================
// 🌍 0. GLOBAL BASE
// =====================================================

let splashActive = true;
let pressureHistory = [];

let currentSession = null;
let lastSPI = null;
let lastConditions = {};
let userLocation = null;
let compassHeading = null;

let bubbleIntensity = 0.7;
let hotspots = [];
let SPI = 50;

let bubbles = [];
let canvas, ctx;
let ripples =[];
let scoutData = {};

const GREEN = "#00ffa6";
const ORANGE = "#ffc400";
const RED = "#ff3b3b";
    
// =====================================================
// 🚀 1. APP BOOT
// =====================================================

let originalScoutHTML;

document.addEventListener("DOMContentLoaded", () => {

    const splash = document.getElementById("splash");
    const main = document.querySelector(".main");

    // ✅ SET IT HERE (correct place)
    originalScoutHTML = document.getElementById("scoutScreen").innerHTML;
    document.getElementById("scoutScreen").classList.add("hidden");
        
    setTimeout(() => {

        splash.style.opacity = "0";
        main.classList.add("main-visible");

        initGPS();
        initCompass();
        startSplash();

        setTimeout(() => splash.remove(), 800);

    }, 2000);
});


// =====================================================
// 💧 2. SPLASH SYSTEM
// =====================================================

const splashCanvas = document.getElementById("splashCanvas");
const splashCtx = splashCanvas?.getContext("2d");

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

function animateSplash() {

    if (!splashActive || !splashCtx) return;

    splashCtx.clearRect(0, 0, splashCanvas.width, splashCanvas.height);

    if (splashRipples.length < 20) createSplashRipple();

    splashRipples.forEach(r => {

        r.r += 0.3;
        r.alpha *= 0.98;

        splashCtx.beginPath();
        splashCtx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        splashCtx.strokeStyle = `rgba(0,255,163,${r.alpha})`;
        splashCtx.stroke();

        if (r.alpha < 0.05) {
            r.r = 0;
            r.alpha = 0.5;
        }
    });

    requestAnimationFrame(animateSplash);
}

function startSplash() {

    animateSplash();

    setTimeout(() => {
        splashActive = false;
        startApp();
        canvas = document.getElementById("waterGraph");
        ctx = canvas ? canvas.getContext("2d") : null;
    }, 3500);
}

// =====================================================
// 🚀 3. MAIN APP
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

    setTimeout(fetchWeatherSafe, 2000);
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

    bubbles.push({
        x: h.x,
        y: canvas.height,
        size: Math.random() * 3 + 2,
        speed: Math.random() + 0.5,
        drift: (Math.random() - 0.5),
        alpha: 0.4
    });
}

function ripple() {
    ripples.push({
        r: 0,
        alpha: 0.3,
        x: canvas.width / 2,
        y: canvas.height * 0.7
    });
}

function animate() {

    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (Math.random() < bubbleIntensity) spawnBubble();

    bubbles.forEach((b, i) => {

        b.y -= b.speed;
        b.x += b.drift;

let gradient = ctx.createRadialGradient(
    b.x - b.size * 0.3,  // light offset (top-left highlight)
    b.y - b.size * 0.3,
    0,
    b.x,
    b.y,
    b.size
);

gradient.addColorStop(0, `rgba(255,255,255,${b.alpha})`);       // bright core
gradient.addColorStop(0.4, `rgba(200,230,255,${b.alpha * 0.5})`); // soft blue glow
gradient.addColorStop(1, `rgba(180,220,255,0)`);                // fade out

ctx.fillStyle = gradient;

ctx.beginPath();
ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2); ctx.fill();


        if (b.y < 0) bubbles.splice(i, 1);
    });

    ripples.forEach((r, i) => {

        r.r += 2;
        r.alpha *= 0.95;

        ctx.strokeStyle = `rgba(0,255,160,${r.alpha})`;

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

    for (let i = 0; i < Math.floor(SPI / 25); i++) {
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
        .then(renderDashboard)
        .catch(simulateWeather);
}

function simulateWeather() {

    renderDashboard({
        main: { temp: 22, pressure: 1018 },
        wind: { speed: 3, deg: 180 },
        clouds: { all: 40 }
    });
}

// =====================================================
// 📊 6. SPI ENGINE (UNIFIED)
// =====================================================

function calculateSPI(p, w, c, windDir, t) {

    let score = 50;

    let trend = getPressureTrend(p);

    if (trend === "rising") score += 10;
    if (trend === "falling") score -= 10;

    if (w >= 5 && w <= 15) score += 8;
    if (c >= 30 && c <= 70) score += 6;
    if (t >= 18 && t <= 24) score += 10;

    score += sunriseWindow();
    score += seasonalWeight();

    let moon = getMoonPhase();
    if (moon === "Full") score += 5;

    return Math.max(0, Math.min(100, score)); }

// =====================================================
// 📊 7. DASHBOARD
// =====================================================

function renderDashboard(data) {

console.log("SPI INPUT:" (t, p, w, c));
  
    const t = data.main.temp;
    const p = data.main.pressure;
    const w = data.wind.speed * 3.6;
    const c = data.clouds.all;
    const windDir = data.wind.deg;
    let surfaceTemp = t - 0.5;
    let bottomTemp = t - 1.5;

    let newSPI = calculateSPI(p, w, c, windDir, t);

    let status = document.getElementById("tactical");
    if (status) status.innerText = "Live data active";

    let msg = document.querySelector(".status-text");
    if (msg) msg.innerText = "Conditions optimal";
    
    // smooth SPI
    if (lastSPI !== null) {
        newSPI = Math.round((newSPI * 0.7) + (lastSPI * 0.3));
    }

    lastSPI = newSPI;
    SPI = newSPI;

    // =========================
    // ✅ UPDATE SPI RING
    // =========================
    updateSPI(SPI);

    // =========================
    // ✅ ENV SCORE
    // =========================
    let env = Math.round(
        (100 - Math.abs(p - 1018) * 2) + (c * 0.2)
    );

    env = Math.max(40, Math.min(env, 95));

    let envEl = document.getElementById("envScore");
    if (envEl) envEl.innerText = env + "%";

    // =========================
    // ✅ VISUAL LINK (important)
    // =========================
    bubbleIntensity = SPI / 100;

// =========================
// ✅ UPDATE TILES
// =========================

// helpers
document.getElementById("moon").innerText = getMoonPhase(); document.getElementById("season").innerText = getSeason();

    // ================= HELPER FUNCTION =================
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

    // ================= OXYGEN =================
    let oxygen = estimateOxygen(t, w, c);

    document.getElementById("oxygen").innerText =
        oxygen.toFixed(1) + " mg/L";

    setIcon("droplets", oxygen, [
        { min: 9, max: 20, color: GREEN },
        { min: 7, max: 8.9, color: ORANGE },
        { min: 0, max: 6.9, color: RED }
    ]);

    // ================= FEED =================
    document.getElementById("feed").innerText = feeding(SPI);

    setIcon("fish", SPI, [
        { min: 70, max: 100, color: GREEN },
        { min: 50, max: 69, color: ORANGE },
        { min: 0, max: 49, color: RED }
    ]);

    // ================= ENV + CONF =================
let envScore = Math.round(
    (100 - Math.abs(p - 1018) * 2) + (c * 0.2) );

envScore = Math.max(40, Math.min(envScore, 95));

let conf = Math.round((SPI + envScore) / 2);

// ✅ UPDATE UI
document.getElementById("envScore").innerText = envScore + "%"; 
document.getElementById("confScore").innerText = conf + "%";


    // ================= TILE GLOW =================
    document.querySelectorAll(".tile").forEach(tile => {
        tile.style.boxShadow = SPI >= 80
            ? "0 0 12px rgba(0,255,156,0.25), inset 0 0 10px rgba(255,255,255,0.05)"
            : "0 6px 18px rgba(0,0,0,0.35), inset 0 0 10px rgba(255,255,255,0.05)";
    });
    

// =========================
// ✅ TACTICAL BAR
// =========================
let text =
    "SPI " + SPI + "% • " +
    "Wind " + w.toFixed(0) + " km/h • " +
    "Pressure " + p + " hPa";

let tactical = document.getElementById("tactical");
if(tactical) tactical.innerText = text;

}

// =====================================================
// 🧠 8. ENVIRONMENT HELPERS
// =====================================================

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

function getPressureTrend(p){

    pressureHistory.push(p);

    if(pressureHistory.length>6) pressureHistory.shift();
    if(pressureHistory.length<2) return "stable";

    let diff = pressureHistory[pressureHistory.length-1] - pressureHistory[0];

    if(diff>1)return "rising";
    if(diff<-1)return "falling";
    return "stable";
}

// =====================================================
// 🧭 9. GPS + COMPASS
// =====================================================

function initGPS(){
    navigator.geolocation.getCurrentPosition(pos=>{
        userLocation = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude
        };
    });
}

function initCompass(){
    window.addEventListener("deviceorientation", e=>{
        if(e.alpha !== null){
            compassHeading = 360 - e.alpha;
        }
    });
}

// =====================================================
// 🎯 10. UI HELPERS
// =====================================================

function updateSPI(v){

    let arc = document.getElementById("spiArc");
    if(!arc) return;

    let r = 110;
    let C = 2 * Math.PI * r;

    arc.style.strokeDasharray = C;
    arc.style.strokeDashoffset = C - (v/100) * C;

    document.getElementById("spiValue").textContent = v + "%";

    // 🔥 ADD YOUR GLOW HERE
    let gauge = document.getElementById("spiGauge");

    if(gauge){
        gauge.style.filter = v >= 70
            ? "drop-shadow(0 0 12px rgba(0,255,156,0.35))"
            : "drop-shadow(0 0 6px rgba(0,255,156,0.15))";
    }

    let envCircle = document.querySelector(".env-circle");
    let confCircle = document.querySelector(".conf-circle");

    if(v >= 70){
        envCircle.style.boxShadow = "0 0 10px rgba(0,255,156,0.4)";
        confCircle.style.boxShadow = "0 0 10px rgba(0,255,156,0.4)";
    } else {
        envCircle.style.boxShadow = "none";
        confCircle.style.boxShadow = "none";
    }
}

// =====================================================
// 🎯 SCOUT MODE (SENSOR TRIGGER)
// =====================================================

function openScout(){

    console.log("Scout mode opened");

    // 👉 Show Scout UI instead of scanning immediately
    document.getElementById("scoutScreen").classList.remove("hidden");

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

function startScan(){

    scoutData = JSON.parse(localStorage.getItem("scoutData")) || {};
    console.log("Loaded Scout Data:", scoutData);

    let screen = document.getElementById("scoutScreen");

    screen.innerHTML = `
        <div class="scout-title">Scanning...</div>
        <div style="margin-top:20px;">Connecting to sensors...</div>
    `;

    setTimeout(() => {

        fetch("http://192.168.4.1/data")
            .then(res => res.json())
            .then(sensorData => {

                if (!sensorData) {
                    console.warn("No sensor data available");
                    screen.innerHTML = `
                        <div class="scout-title">No Sensor Found</div>
                        <div style="margin-top:20px;">Check connection</div>
                        <div class="scout-btn" onclick="closeScout()">Back</div>
                    `;
                    return;
                }

                renderDashboard(sensorData);
                showSummary();

            })
            .catch(() => {
                screen.innerHTML = `
                    <div class="scout-title">Connection Failed</div>
                    <div style="margin-top:20px;">ESP not reachable</div>
                    <div class="scout-btn" onclick="closeScout()">Back</div>
                `;
            });

    }, 2000); // ⬅️ THIS WAS MISSING

}

function saveAndScan() {

    console.log("Scout saved:", scoutData);

    localStorage.setItem("scoutData", JSON.stringify(scoutData));

    startScan();
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

function closeScout(){

    let screen = document.getElementById("scoutScreen");

    screen.classList.add("hidden");

    screen.innerHTML = originalScoutHTML; 
}


