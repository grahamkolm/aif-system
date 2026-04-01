// =====================================================
// 🧠 AIF SPI ENGINE V6 ELITE
// PURE LOGIC • MODULAR • FUTURE-PROOF
// =====================================================

// =====================================================
// 🔹 ENGINE FACTORY (STATE SAFE)
// =====================================================

function createSPIEngine() {
    return {
        pressureHistory: [],
        lastSurfaceTemp: null
    };
}

// =====================================================
// 🔹 MAIN ENTRY
// =====================================================

function calculateSPI(state, data) {

    let {
        pressure: p,
        wind: w,
        cloud: c,
        windDir,
        temp: t,
        depth = 6
    } = data;

    let score = 45;

    // =========================
    // MODULES
    // =========================

    score += pressureModel(state, p);
    score += windModel(w);
    score += cloudModel(c);
    score += tempModel(state, t, w, c, depth);
    score += oxygenModel(state, t, w, c);
    score += astroModel();
    score += seasonalModel();
    score += weatherPhaseModel(state, p, w, c);

    // =========================
    // NORMALIZATION
    // =========================

    if (score > 85) {
        score -= (score - 85) * 0.7;
    }

    return clamp(score, 25, 95);
}

// =====================================================
// 🔹 PRESSURE MODULE
// =====================================================

function pressureModel(state, p) {

    let score = 0;

    let trend = getPressureTrend(state, p);

    if (trend === "rising") score += 8;
    if (trend === "stable") score += 5;
    if (trend === "falling") score -= 10;

    if (p >= 1018 && p <= 1024) score += 8;

    let rate = Math.abs(
        (state.pressureHistory.at(-1) || 0) -
        (state.pressureHistory[0] || 0)
    );

    if (rate >= 3) score -= 6;
    if (rate <= 1) score += 3;

    return score;
}

// =====================================================
// 🔹 WIND MODULE
// =====================================================

function windModel(w) {

    let score = 0;

    if (w >= 6 && w <= 15) score += 8;
    if (w > 18) score -= 4;
    if (w < 3) score -= 4;

    return score;
}

// =====================================================
// 🔹 CLOUD MODULE
// =====================================================

function cloudModel(c) {

    let score = 0;

    if (c >= 30 && c <= 70) score += 6;
    if (c > 80) score += 3;
    if (c < 10) score -= 4;

    return score;
}

// =====================================================
// 🔹 TEMP + WATER MODEL
// =====================================================

function tempModel(state, t, w, c, depth) {

    let score = 0;

    if (t >= 16 && t <= 24) score += 10;
    if (t < 10) score -= 10;
    if (t > 28) score -= 6;

    let surfaceTemp = estimateSurfaceTemp({
        prevWaterTemp: state.lastSurfaceTemp || (t - 0.5),
        airTemp: t,
        windSpeed: w || 2,
        sunFactor: 1 - (c || 0) / 100,
        hour: new Date().getHours()
    });

    let bottomTemp = estimateBottomTemp({
        surfaceTemp,
        depth,
        windSpeed: w
    });

    state.lastSurfaceTemp = surfaceTemp;

    let diff = Math.abs(surfaceTemp - bottomTemp);

    if (diff < 1) score += 5;

    return score;
}

// =====================================================
// 🔹 OXYGEN MODEL (NEW FIX)
// =====================================================

function oxygenModel(state, t, w, c) {

    let oxygen = estimateOxygen(t, w, c);

    let score = 0;

    if (oxygen >= 9) score += 5;
    if (oxygen < 7) score -= 6;

    return score;
}

// =====================================================
// 🔹 ASTRO MODEL
// =====================================================

function astroModel() {

    let score = 0;

    let moon = getMoonPhase();

    if (moon === "Full") score += 5;
    if (moon === "Waxing") score += 3;
    if (moon === "Waning") score += 2;
    if (moon === "New") score -= 3;

    score += sunriseWindow();

    return score;
}

// =====================================================
// 🔹 SEASONAL MODEL
// =====================================================

function seasonalModel() {

    let m = new Date().getMonth() + 1;

    if (m <= 2 || m === 12) return 8;
    if (m <= 5) return 4;
    if (m <= 8) return -4;

    return 6;
}

// =====================================================
// 🔹 WEATHER PHASE MODEL
// =====================================================

function weatherPhaseModel(state, p, w, c) {

    let trend = getPressureTrend(state, p);

    let phase = detectWeatherPhase(p, trend, c, w);

    if (phase === "Pre-frontal feeding window") return 12;
    if (phase === "Post-frontal stabilization") return 6;

    return 0;
}

// =====================================================
// 🔹 ENVIRONMENT HELPERS
// =====================================================

function getPressureTrend(state, p) {

    state.pressureHistory.push(p);

    if (state.pressureHistory.length > 6) {
        state.pressureHistory.shift();
    }

    if (state.pressureHistory.length < 2) return "stable";

    let diff = state.pressureHistory.at(-1) - state.pressureHistory[0];

    if (diff > 1) return "rising";
    if (diff < -1) return "falling";

    return "stable";
}

function detectWeatherPhase(p, trend, c, w) {

    if (trend === "falling" && w >= 10 && c > 50)
        return "Pre-frontal feeding window";

    if (trend === "rising" && p >= 1015)
        return "Post-frontal stabilization";

    if (trend === "stable" && p >= 1018 && p <= 1025)
        return "Stable high pressure phase";

    return "Unstable weather phase";
}

// =====================================================
// 🔹 WATER PHYSICS
// =====================================================

function estimateSurfaceTemp({ prevWaterTemp, airTemp, windSpeed, sunFactor, hour }) {

    let dayFactor = (hour >= 6 && hour <= 18) ? 1 : -0.5;
    let airEffect = (airTemp - prevWaterTemp) * 0.1;
    let sunEffect = sunFactor * 0.5 * dayFactor;
    let windEffect = -windSpeed * 0.03;

    return prevWaterTemp + airEffect + sunEffect + windEffect; }

function estimateBottomTemp({ surfaceTemp, depth, windSpeed }) {

    let dropRate = windSpeed > 18 ? 0.15 : 0.1;

    let bottomTemp = surfaceTemp - (depth * dropRate);

    if (bottomTemp >= surfaceTemp) {
        bottomTemp = surfaceTemp - 0.5;
    }

    return bottomTemp;
}

function estimateOxygen(temp, wind, cloud) {

    let oxygen = 9;

    if (temp > 25) oxygen -= 2;
    else if (temp > 20) oxygen -= 1;

    if (wind >= 6 && wind <= 18) oxygen += 1.5;
    else if (wind > 18) oxygen += 2;

    if (cloud > 60) oxygen += 0.5;

    return clamp(oxygen, 5, 12);
}

// =====================================================
// 🔹 UTIL
// =====================================================

function sunriseWindow() {

    let h = new Date().getHours();

    if (h >= 5 && h <= 9) return 8;
    if (h >= 17 && h <= 20) return 10;

    return 0;
}

function getMoonPhase() {

    const phases = ["New", "Waxing", "Full", "Waning"];
    let day = new Date().getDate();
    return phases[Math.floor((day % 28) / 7)]; }

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v)); }
