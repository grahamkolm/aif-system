console.log("module loaded");

function render(data){

let temp=data.main.temp;
let pressure=data.main.pressure;
let wind=data.wind.speed * 3.6;
let cloud=data.clouds ? data.clouds.all : 0;

let spi = calculateSPI(temp,pressure,wind,cloud);
let confidence = calculateConfidence(temp,pressure,wind,cloud);

document.getElementById("spi").textContent = spi + "%";

let confText = document.getElementById("confidenceText");
if(confText){
confText.textContent = "CONF " + confidence + "%"; }

let air=document.getElementById("air");
let pressureBox=document.getElementById("pressure");
let windBox=document.getElementById("wind");
let cloudBox=document.getElementById("cloud");

if(air) air.innerText=temp.toFixed(1)+"°C";
if(pressureBox) pressureBox.innerText=pressure+" hPa";
if(windBox) windBox.innerText=wind.toFixed(1)+" km/h";
if(cloudBox) cloudBox.innerText=cloud + "%";

}
