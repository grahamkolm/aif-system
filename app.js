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
let canvas = document.getElementById("waterGraph");
let ctx = canvas ? canvas.getContext("2d") : null; let ripples = [];

// =====================================================
// 🚀 1. APP BOOT
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

    const splash = document.getElementById("splash");
    const main = document.querySelector(".main");

    setTimeout(() => {

        splash.style.opacity = "0";
        main.classList.add("visible");

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
    splashCanvas.height = window.innerHeight; } window.addEventListener("resize", resizeSplash); resizeSplash();

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
        document.getElementById("splash")?.remove();
        startApp();
    }, 3500);
}

// =====================================================
// 🚀 3. MAIN APP
// =====================================================

function startApp() {

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

        ctx.fillStyle = `rgba(0,255,160,${b.alpha})`;

        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();

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

    if (w >= 5 && w <= 15) score += 12;
    if (c >= 30 && c <= 70) score += 10;
    if (t >= 18 && t <= 24) score += 20;

    score += sunriseWindow();
    score += seasonalWeight();

    let moon = getMoonPhase();
    if (moon === "Full") score += 5;

    return Math.max(0, Math.min(100, score)); }

// =====================================================
// 📊 7. DASHBOARD
// =====================================================

function renderDashboard(data) {

    const t = data.main.temp;
    const p = data.main.pressure;
    const w = data.wind.speed * 3.6;
    const c = data.clouds.all;
    const windDir = data.wind.deg;

    let newSPI = calculateSPI(p, w, c, windDir, t);

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
    // ✅ CONF SCORE
    // =========================
    let conf = Math.round((SPI + env) / 2);

    let confEl = document.getElementById("confScore");
    if (confEl) confEl.innerText = conf + "%";

    // =========================
    // ✅ VISUAL LINK (important)
    // =========================
    bubbleIntensity = SPI / 100;

// =========================
// ✅ UPDATE TILES
// =========================
document.getElementById("air").innerText = t.toFixed(1) + "°C"; 
document.getElementById("pressure").innerText = p + " hPa"; 
document.getElementById("wind").innerText = w.toFixed(1) + " km/h"; 
document.getElementById("cloud").innerText = c + "%";

// simulated values (until sensor ready) document.getElementById("surface").innerText = (t - 0.5).toFixed(1) + "°C"; document.getElementById("bottom").innerText = (t - 1.5).toFixed(1) + "°C";

// helpers
document.getElementById("moon").innerText = getMoonPhase(); document.getElementById("season").innerText = getSeason();

// simple oxygen estimate
let oxygen = 8 + (w * 0.1) - (t * 0.1);
document.getElementById("oxygen").innerText = oxygen.toFixed(1);

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

    document.getElementById("spiValue").textContent = v + "%"; }

