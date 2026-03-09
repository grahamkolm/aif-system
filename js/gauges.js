function updateSPI(value){

let arc = document.getElementById("spiArc");
let text = document.getElementById("spiValue");

text.textContent = value + "%";

let percent = value / 100;

let length = 408;

arc.style.strokeDasharray = length;

arc.style.strokeDashoffset = length - (length * percent);


if(value >= 70){

arc.style.stroke = "#00ff9c";
arc.style.filter = "drop-shadow(0 0 10px #00ff9c)";

}
else if(value >= 50){

arc.style.stroke = "#ffc400";
arc.style.filter = "none";

}
else{

arc.style.stroke = "#ff3b3b";
arc.style.filter = "none";

}

}



function updateCONF(value){

let arc = document.getElementById("confArc");
let text = document.getElementById("confValue");

text.textContent = value + "%";

let percent = value / 100;

let length = 408;

arc.style.strokeDasharray = length;

arc.style.strokeDashoffset = length - (length * percent);

}


arc.style.strokeDashoffset = length - (length * percent);

}

