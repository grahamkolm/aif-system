// =====================================================
// 🌍 0. GLOBAL BASE
// =====================================================

let diff = 0;
let splashActive = true;
let tempHistory = [];
let pressureHistory = [];
let needle;
let tempModel = {
    surface: null,
    bottom: null,
    source: "forecast"
};
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
let drops = [];

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
    setupHold("envScore", showENVInsight);
    setupHold("confScore", showCONFInsight);

    
    // ✅ SET IT HERE (correct place)
    originalScoutHTML = document.getElementById("scoutScreen").innerHTML;
    document.getElementById("scoutScreen").classList.add("hidden");
    needle = document.getElementById("compassNeedle");
    document.body.addEventListener("click", enableCompass, { once: true });
    
    setTimeout(() => {
    splashActive = false;

    // ✅ FETCH DATA IMMEDIATELY
    fetchWeatherSafe();

    startApp();

    canvas = document.getElementById("waterGraph");
    ctx = canvas ? canvas.getContext("2d") : null;

    // ✅ THEN KEEP UPDATING
    setInterval(fetchWeatherSafe, 30000);

}, 3500);

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
    updateCompass(compassHeading || 0);
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
            if(typeof renderDashboard === "function") {
                renderDashboard(data);
            } else {
                console.error("renderDashboard NOTfound");
            }
        })
        .catch(simulateWeather);
}

function simulateWeather() {

    renderDashboard({
        main: { temp: 22, pressure: 1018 },
        wind: { speed: 3, deg: 180 },
        clouds: { all: 40 }
    });
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

    // Surface (0–3m)
    let surface;

    if (airTemp >= 25) surface = airTemp - 0.5;
    else if (airTemp >= 20) surface = airTemp - 1;
    else surface = airTemp - 1.5;

    // Bottom (~7m average)
    let bottom;

    if (airTemp >= 25) bottom = surface - 3.5;
    else if (airTemp >= 20) bottom = surface - 3;
    else bottom = surface - 2;

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

    // ================= WIND =================
    let windScore = 0;

    if (w >= 5 && w <= 15) windScore = 20;
    else if (w >= 3 && w < 5) windScore = 10;
    else if (w > 15) windScore = 5;
    else windScore = 0;

    score += windScore;

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
    reasons.push("Optimal light penetration"); } else if (light < 20) {
    score -= 5;
    reasons.push("Too dark — reduced visibility"); } else {
    score -= 3;
    reasons.push("Too bright — fish cautious"); 
}

    // ================= DEPTH =================
if (depth >= 2 && depth <= 5) {
    score += 10;
    reasons.push("Ideal feeding depth"); } else if (depth < 1) {
    score -= 6;
    reasons.push("Too shallow");
} else if (depth > 8) {
    score -= 4;
    reasons.push("Too deep for active feeding"); 
}

    // ================= TIME WINDOWS =================
    score += sunriseWindow() * 0.5;
    score += seasonalWeight() * 0.5;

    // ================= FINAL NORMALIZE =================
    score = Math.max(20, Math.min(95, score));

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
// 📊 7. DASHBOARD
// =====================================================

function renderDashboard(data) {

    lastConditions = data;
    const t = data.main.temp;
    const p = data.main.pressure;
    const w = data.wind.speed * 3.6;
    const c = data.clouds.all;
    const windDir = data.wind?.deg || 0;
    
    // ✅ ALWAYS define diff
    diff = 0;

    if (compassHeading !== null) {
    diff = Math.abs(windDir - compassHeading);
    if (diff > 180) diff = 360 - diff;

    console.log("Wind vs Heading off:", diff); }

// ✅ ALWAYS safe now
    let advice = getCastingAdvice(diff);
    console.log("Casting:", advice);

    const light = data.light || 50;
    const depth = data.depth || 3;
    let temps = calculateWaterTemps(t);
    if (tempModel.source === "sensor") {
    temps = tempModel;
}
    let surfaceTemp = tempModel.surface ?? (t - 0.5);
    let bottomTemp = tempModel.bottom ?? (t - 1.5);
    updateCompass(windDir);
    let dam = loadDamData();

    console.log("SPI INPUT:", t, p, w, c);
    
    let result = calculateSPI(p, w, c, windDir, t, light, depth); let newSPI = result.score;

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
    // ✅ UPDATE SPI RING 
    // =========================
    updateSPI(finalSPI);

 
    // =========================
    // ✅ VISUAL LINK (important)
    // =========================
    bubbleIntensity = finalSPI / 100;
    document.getElementById("feed").innerText = feeding(finalSPI);

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

    function getScoreColor(value) {
    if (value >= 80) return "#00ff9c";   // green
    if (value >= 60) return "#ffd700";   // yellow
    return "#ff4d4d";                    // red
}
   
// ================= ENV + CONF =================
// ================= ENV ================= 
let envScore = calculateENV(p, c, w, light, t);

let envEl = document.getElementById("envScore");
if (envEl) envEl.innerText = envScore + "%";
   
// ================= CONF =================    
let confScore = Math.round(
    (SPI * 0.5) +
    (envScore * 0.3) +
    (Math.abs(50 - Math.abs(p - 1015)) * 0.2) );

confScore = Math.max(40, Math.min(95, confScore));

document.getElementById("confScore").innerText = confScore + "%";

// 🎯 GET ELEMENTS (ONLY ONCE)
const spiCircle = document.getElementById("spiCircle");
const envCircle = document.getElementById("envCircle");
const confCircle = document.getElementById("confCircle");

// 🎨 COLORS (ONLY ONCE)
const spiColor = getScoreColor(finalSPI); 
const envColor = getScoreColor(envScore); 
const confColor = getScoreColor(confScore);

// ✅ APPLY COLORS
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
    confCircle.style.boxShadow = `0 0 10px ${confColor}`; 
}

function setRingProgress(selector, value) {
  const circle = document.querySelector(selector);
    if (!circle) return;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  const offset = circumference - (value / 100) * circumference;
  circle.style.strokeDashoffset = offset; 
}
    
// ✅ TEXT COLORS
const spiText = document.getElementById("spiValue");
const envText = document.getElementById("envScore");
const confText = document.getElementById("confScore");

if (spiText) spiText.style.color = spiColor; 
if (envText) envText.style.color = envColor; 
if (confText) confText.style.color = confColor;
    
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
let insights = [];
let zone = getBestZone();

// Wind
if (w >= 5 && w <= 15) {
    insights.push("Wind pushing food into zone"); }

// Pressure
if (p > 1015) {
    insights.push("Stable pressure supports feeding"); } else {
    insights.push("Unstable pressure slows activity"); }

// Cloud
if (c >= 30 && c <= 70) {
    insights.push("Low light increases confidence"); }

// Temperature
if (t >= 18 && t <= 24) {
    insights.push("Fish active in upper layers"); }

// Zone logic
if (zone.includes("Shallow") && w > 10) {
    insights.push("Strong wind fish tight to windward bank"); }

if (light < 30 && depth > 4) {
    insights.push("Fish likely holding deeper due to low light"); }

if (light > 70 && depth < 2) {
    insights.push("Bright shallow water — fish spooked"); }

if (depth >= 3 && depth <= 5 && light >= 40) {
    insights.push("Perfect ambush zone"); }
    
// LIMIT TO 3
let text = insights.slice(0, 3).join(" • ");

let tactical = document.getElementById("tactical");
if (tactical) {
    tactical.innerText = text + " • " + advice;
}

    showInsight(
    SPI, 
    envScore,
    confScore,
    light,
    depth
    );

}

// =====================================================
// 🧠 8. ENVIRONMENT HELPERS
// =====================================================

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

    let diff = tempHistory[tempHistory.length - 1] - tempHistory[0];

    if (diff > 1) return "warming";
    if (diff < -1) return "cooling_fast";

    return "stable";
}
    
setRingProgress(`env-progress`, envScore);
setRingProgress(`conf-progress`, confScore);

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
    if (diff < 45) return "Into wind ❌";
    if (diff > 135) return "Perfect windward 🔥";
    return "Crosswind ⚠️";
}

// =====================================================
// 🧭 9. GPS + COMPASS + MAP
// =====================================================

function initGPS(){
    navigator.geolocation.getCurrentPosition(pos=>{
        userLocation = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude
        };
    });
}

function enableCompass() {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
        DeviceOrientationEvent.requestPermission()
            .then(response => {
                if (response === "granted") {
                    console.log("✅ Compass enabled");
                } else {
                    console.log("❌ Permission denied");
                }
            })
            .catch(console.error);
    } else {
        console.log("✅ Compass auto-enabled (Android)");
    }
}

window.addEventListener("deviceorientation", e => {
    console.log("alpha:", e.alpha);
    
    if (e.alpha !== null && e.alpha !== undefined) {
        compassHeading = 360 - e.alpha;
    } else {
        compassHeading = 0; // fallback
    }
    console.log("Heading:", compassHeading);
});

function updateCompass(deg) {
const dirText = getDirection(deg);
console.log("Facing:", dirText);

    if (!needle) {
        console.log("❌ compassNeedle NOT FOUND");
        return;
    }

    if (typeof deg !== "number") return;

    needle.style.transform =
        `translate(-50%, -100%) rotate(${deg}deg)`; }

let mapInstance;

function openMap() {

    const mapScreen = document.getElementById("mapScreen");

    mapScreen.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    // 👉 FORCE layout BEFORE Leaflet init
    setTimeout(() => {

        if (!mapInstance) {

            mapInstance = L.map('mapContainer', {
                zoomControl: true
            }).setView([-26.2, 28.0], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '',
                maxZoom: 19
            }).addTo(mapInstance);

            L.marker([-26.2, 28.0])
                .addTo(mapInstance)
                .bindPopup("Your fishing spot 🎯")
                .openPopup();
        }

        // 🔥 DOUBLE FIX (important)
        setTimeout(() => {
            mapInstance.invalidateSize();
        }, 200);

    }, 300); // ⬅️ THIS DELAY FIXES BLACK SCREEN }
}


function closeMap() {
    document.getElementById("mapScreen").classList.add("hidden");
    document.body.style.overflow = "auto";
}


// =====================================================
// 🎯 10. UI HELPERS
// =====================================================

function updateSPI(v){

    let arc = document.getElementById("spiArc");
    if(!arc) return;

    let color = GREEN;

    if (v < 50) color = RED;
    else if (v < 70) color = ORANGE;

    arc.style.stroke = color;

    let r = 110;
    let C = 2 * Math.PI * r;

    arc.style.strokeDasharray = C;
    arc.style.strokeDashoffset = C - (v/100) * C;

    document.getElementById("spiValue").textContent = v.toFixed(1) + "%";

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
    const content = document.getElementById("aiContent");
    const toggle = document.getElementById("aiToggle");

    if (!panel || !content || !toggle) return;

    panel.classList.toggle("collapsed");

    if (panel.classList.contains("active")) {
        toggle.innerText = "−";

        // 🔥 FORCE refresh when opened
        showInsight(SPI, 
            parseInt(document.getElementById("envScore")?.innerText || 0),
            parseInt(document.getElementById("confScore")?.innerText || 0),
            parseInt(document.getElementById("light")?.innerText || 50),
            parseFloat(document.getElementById("depth")?.innerText || 3)
        );

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

function showInsight(SPI, envScore, confScore, light, depth) {

    let insight = "";
    let parts = [];

    // ================= CORE =================
    if (SPI > 75) {
        parts.push("🔥 Strong feeding conditions — high chance of bites.");
    } else if (SPI > 60) {
        parts.push("👍 Decent conditions — fish are active.");
    } else {
        parts.push("⚠️ Slow conditions — consider moving spots.");
    }

    const windDir = lastConditions?.wind?.deg || 0;

    parts.push(getCastDirection(windDir));
    parts.push(getDepthStrategy(light, depth));
    parts.push(getBaitSuggestion(SPI));

    // ================= WIND =================
    if (lastConditions?.wind?.speed * 3.6 >= 5) {
        parts.push("🌬 Wind pushing food into feeding zones.");
    } else {
        parts.push("🌊 Calm water — less natural feeding movement.");
    }

    // ================= LIGHT =================
    if (light < 30) {
        parts.push("🌅 Low light — fish moving shallow.");
    } else if (light > 70) {
        parts.push("🌞 Bright light — fish holding deeper.");
    }

    // ================= CLOUD =================
    if (lastConditions?.clouds?.all >= 30 && lastConditions?.clouds?.all <= 70) {
        parts.push("☁️ Cloud cover improves fish confidence.");
    }

    // ================= TEMP =================
    if (lastConditions?.main?.temp >= 18 && lastConditions?.main?.temp <= 24) {
        parts.push("🌡 Optimal temperature for feeding.");
    }

    // ================= FINAL BUILD =================
    insight = parts.join("\n");

    const el = document.getElementById("aiContent");
    if (el) el.innerText = insight;
}

function showSPIInsight(){

    let t = lastConditions?.main?.temp || "-";
    let p = lastConditions?.main?.pressure || "-";
    let w = lastConditions?.wind?.speed 
        ? (lastConditions.wind.speed * 3.6).toFixed(1)
        : "-";
    let c = lastConditions?.clouds?.all || "-";

    let advice = generateAICoach(SPI);

    alert(
`SPI: ${SPI.toFixed(1)}%

WHY:
• Wind: ${w} km/h → ${w >= 5 && w <= 15 ? "Ideal" : "Suboptimal"} • Pressure: ${p} hPa → ${p > 1015 ? "Stable" : "Unstable"} • Cloud: ${c}% → ${c >= 30 && c <= 80 ? "Good cover" : "Less optimal"} • Temperature: ${t}°C → ${t >= 18 && t <= 24 ? "Optimal" : "Off range"}

WHAT TO DO:
${advice}`
    );
}

function showENVInsight(){

    let t = lastConditions?.main?.temp || "-";
    let p = lastConditions?.main?.pressure || "-";
    let c = lastConditions?.clouds?.all || "-";
    let oxygen = estimateOxygen(t, 0, c).toFixed(1);

    alert(
`ENV: ${document.getElementById("envScore").innerText}

Environment Conditions:

• Pressure: ${p} hPa → ${p > 1015 ? "Stable" : "Unstable"} • Cloud: ${c}% → ${c >= 30 && c <= 80 ? "Good cover" : "Low cover"} • Oxygen: ${oxygen} mg/L → ${oxygen > 7 ? "Healthy" : "Low"}

Overall environment is ${p > 1015 && c >= 30 ? "favorable" : "moderate"}`
    );
}

function showCONFInsight(){

    let env = document.getElementById("envScore").innerText;
    let spi = SPI.toFixed(1);

    alert(
`CONF: ${document.getElementById("confScore").innerText}

Confidence Level Analysis:

• SPI: ${spi}% → Fishing potential
• ENV: ${env} → Environmental support

Confidence is ${
    SPI > 70 ? "HIGH" :
    SPI > 50 ? "MODERATE" :
    "LOW"
}

Prediction reliability is based on combined conditions`
    );
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
    if (SPI >= 75) return "Shallow (Windward)";
    if (SPI >= 60) return "Mid-depth";
    return "Deep / Structure";
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

document.addEventListener("DOMContentLoaded", () => {

  const svg = document.getElementById("spiGauge");
  if (!svg) return;

  for (let i = 0; i < 360; i += 15) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

    line.setAttribute("x1", 150);
    line.setAttribute("y1", 15);
    line.setAttribute("x2", 150);
    line.setAttribute("y2", 30);

    line.setAttribute("stroke", "white");
    line.setAttribute("stroke-width", i % 90 === 0 ? 3 : 1); // bold at N/E/S/W
    line.setAttribute("opacity", "0.3");

    line.setAttribute("transform", `rotate(${i} 150 150)`);

    svg.appendChild(line);
  }

});


window.retryConnection = retryConnection;
window.startScan = startScan;
window.closeScout = closeScout;

