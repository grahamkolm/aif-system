function startSystem(){

console.log("AIF system starting");

if(typeof updateData === "function"){
    updateData();
}

setInterval(()=>{
    if(typeof updateData === "function"){
        updateData();
    }
},60000);

}

window.onload = startSystem;
