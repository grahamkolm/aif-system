// =========================
// 🧠 AIF SPI ENGINE v5 (CLEAN STRUCTURE) // =========================

/*
RULES:
✔ No DOM
✔ No fetch
✔ No UI
✔ PURE LOGIC ONLY 
*/

// =========================
// 1. GLOBAL STATE
// =========================

let pressureHistory = [];
let lastSurfaceTemp = null;

// =========================
// 2. CORE SPI ENGINE
// =========================

function calculateSPI(p, w, c, windDir, t){

let score = 45;

// -----------------
// PRESSURE TREND
// -----------------

let trend = getPressureTrend(p);

if(trend === "rising") score += 8;
if(trend === "stable") score += 5;
if(trend === "falling") score -= 10;

// -----------------
// PRESSURE RANGE
// -----------------

if(p >= 1018 && p <= 1024){
    score += 8;
}

// -----------------
// PRESSURE VELOCITY
// -----------------

let pressureRate = Math.abs(
    (pressureHistory.at(-1) || 0) - (pressureHistory[0] || 0) );

if(pressureRate >= 3) score -= 6;
if(pressureRate <= 1) score += 3;

// -----------------
// WIND
// -----------------

if(w >= 6 && w <= 15) score += 8;
if(w > 18) score -= 4;
if(w < 3) score -= 4;

// -----------------
// CLOUD
// -----------------

if(c >= 30 && c <= 70) score += 6;
if(c > 80) score += 3;
if(c < 10) score -= 4;

// -----------------
// TEMPERATURE
// -----------------

if(t >= 16 && t <= 24) score += 10;
if(t < 10) score -= 10;
if(t > 28) score -= 6;

// -----------------
// THERMO STABILITY
// -----------------

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

let tempDiff = Math.abs(surfaceTemp - bottomTemp);

if(tempDiff < 1){
    score += 5;
}

// -----------------
// SUNRISE WINDOW
// -----------------

score += sunriseWindow();

// -----------------
// SEASONAL
// -----------------

score += seasonalWeight();

// -----------------
// MOON
// -----------------

let moon = getMoonPhase();

if(moon === "Full") score += 5;
if(moon === "Waxing") score += 3;
if(moon === "Waning") score += 2;
if(moon === "New") score -= 3;

// -----------------
// WEATHER PHASE
// -----------------

let phase = detectWeatherPhase(p, trend, c, w);

if(phase === "Pre-frontal feeding window") score += 12; if(phase === "Post-frontal stabilization") score += 6;

// -----------------
// ANTI-95% FIX (IMPORTANT)
// -----------------

if(score > 85){
    score -= (score - 85) * 0.7;
}

// FINAL CLAMP
return Math.max(25, Math.min(score, 95));

}

// =========================
// 3. ENVIRONMENT DETECTION
// =========================

function getPressureTrend(p){

pressureHistory.push(p);

if(pressureHistory.length > 6){
    pressureHistory.shift();
}

if(pressureHistory.length < 2){
    return "stable";
}

let diff = pressureHistory.at(-1) - pressureHistory[0];

if(diff > 1) return "rising";
if(diff < -1) return "falling";

return "stable";
}

// =========================
// WEATHER PHASE
// =========================

function detectWeatherPhase(p, trend, c, w){

if(trend === "falling" && w >= 10 && c > 50){
    return "Pre-frontal feeding window"; }

if(trend === "rising" && p >= 1015){
    return "Post-frontal stabilization"; }

if(trend === "stable" && p >= 1018 && p <= 1025){
    return "Stable high pressure phase"; }

return "Unstable weather phase";
}

// =========================
// 4. WATER MODELS
// =========================

function estimateSurfaceTemp({
    prevWaterTemp,
    airTemp,
    windSpeed,
    sunFactor,
    hour
}){

let dayFactor = (hour >= 6 && hour <= 18) ? 1 : -0.5; let airEffect = (airTemp - prevWaterTemp) * 0.1; let sunEffect = sunFactor * 0.5 * dayFactor; let windEffect = -windSpeed * 0.03;

return prevWaterTemp + airEffect + sunEffect + windEffect;

}

function estimateBottomTemp(data){

let surfaceTemp = data.surfaceTemp;
let depth = data.depth;
let w = data.windSpeed || 2;

let dropRate = w > 18 ? 0.15 : 0.1;

let bottomTemp = surfaceTemp - (depth * dropRate);

if(bottomTemp >= surfaceTemp){
    bottomTemp = surfaceTemp - 0.5;
}

return bottomTemp;

}

function estimateOxygen(temp, wind, cloud){

let oxygen = 9;

if(temp > 25) oxygen -= 2;
else if(temp > 20) oxygen -= 1;

if(wind >= 6 && wind <= 18) oxygen += 1.5; else if(wind > 18) oxygen += 2;

if(cloud > 60) oxygen += 0.5;

return Math.max(5, Math.min(12, oxygen));

}

// =========================
// 5. STRIKE LOGIC
// =========================

function detectStrikeWindow(spi, trend, w, c){

let hour = new Date().getHours();

if(hour >= 5 && hour <= 9 && spi >= 60){
    return "Sunrise window";
}

if(hour >= 17 && hour <= 20 && spi >= 60){
    return "Sunset window";
}

if(trend === "falling" && w >= 10 && c > 50){
    return "Pre-frontal strike window forming"; }

if(trend === "rising" && spi >= 65){
    return "Post-frontal feeding window"; }

if(spi >= 75){
    return "High probability feeding activity"; }

return "No major strike window detected";

}

function predictStrikeDuration(spi, trend, w, c){

let duration = 20;

if(spi >= 80) duration += 40;
else if(spi >= 65) duration += 25;
else if(spi >= 50) duration += 10;

if(trend === "stable") duration += 10;
if(trend === "rising") duration += 5;
if(trend === "falling") duration -= 5;

if(w >= 6 && w <= 15) duration += 10;
if(w > 18) duration -= 5;

if(c > 60) duration += 5;

return duration;

}

// =========================
// 6. UTILITIES
// =========================

function sunriseWindow(){

let h = new Date().getHours();

if(h >= 5 && h <= 9) return 8;
if(h >= 17 && h <= 20) return 10;

return 0;

}

function seasonalWeight(){

let m = new Date().getMonth() + 1;

if(m <= 2 || m == 12) return 8;
if(m <= 5) return 4;
if(m <= 8) return -4;

return 6;

}

function getMoonPhase(){

let d = new Date();
let lp = 2551443;
let now = d.getTime() / 1000;
let new_moon = 592500;

let phase = ((now - new_moon) % lp) / lp;

if(phase < 0.25) return "Waxing";
if(phase < 0.5) return "Full";
if(phase < 0.75) return "Waning";

return "New";

}

function getMoonPhase(){
    const phases = ["New", "Waxing", "Full", "Waning"];
    let day = new Date().getDate();
    return phases[Math.floor((day % 28) / 7)]; }

function getSeason(){
    let month = new Date().getMonth() + 1;

    if(month >= 12 || month <= 2) return "Summer";
    if(month >= 3 && month <= 5) return "Autumn";
    if(month >= 6 && month <= 8) return "Winter";
    return "Spring";
}
