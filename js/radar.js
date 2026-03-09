console.log("module loaded");

function render(data){

let temp=data.main.temp;
let pressure=data.main.pressure;
let wind=data.wind.speed * 3.6;
let cloud=data.clouds ? data.clouds.all : 0;

let spi = calculateSPI(temp,pressure,wind,cloud);
let confidence = calculateConfidence(temp,pressure,wind,cloud);

document.getElementById("spi").textContent = spi + "%"; document.getElementById("confidenceText").textContent = "CONF " + confidence + "%";

document.getElementById("air").innerText=temp.toFixed(1)+"°C";
document.getElementById("pressure").innerText=pressure+" hPa"; document.getElementById("wind").innerText=wind.toFixed(1)+" km/h"; document.getElementById("cloud").innerText=cloud + "%";

}
