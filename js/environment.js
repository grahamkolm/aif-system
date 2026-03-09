console.log("module loaded");

async function fetchWeather(){

const url = "https://api.openweathermap.org/data/2.5/weather?lat=-26.2&lon=28.0&units=metric&appid=63ba514dc7c2242cb10cd2632d2569ad";

let r = await fetch(url);
let j = await r.json();

return j;

}

function calculateSPI(temp,pressure,wind,cloud){

let score=40;

if(pressure>1015 && pressure<1022) score+=15;
if(wind<5) score+=15;
if(cloud<50) score+=10;

let h=new Date().getHours();

if(h>=8 && h<=9) score+=20;

score=Math.min(score,95);

return score;

}

function calculateConfidence(temp,pressure,wind,cloud){

let score = 50;

if(pressure >= 1015 && pressure <= 1022) score += 15;

if(wind >= 3 && wind <= 12) score += 15;

if(cloud >= 20 && cloud <= 70) score += 10;

if(temp >= 10 && temp <= 30) score += 10;

score = Math.max(0, Math.min(95, score));

return score;

}
