//themeManager sets CSS to match user's settings
//(c) David Deraedt @ https://github.com/davidderaedt/CC-EXT-SDK/tree/master/templates/theme
themeManager.init();
//Define CS interface
var csInterface = new CSInterface();
//Assign buttons
var swatchButton = window.document.getElementById("pmsSwatch");
var swatchInput = window.document.getElementById("pmsInput");
var swatchTypePMS = window.document.getElementById("swatchType");
var colorSubmit = window.document.getElementById("pmsInput");
var autoCheck = window.document.getElementById("auto");
var cyanCheck = window.document.getElementById("cyan");
var magentaCheck = window.document.getElementById("magenta");
var yellowCheck = window.document.getElementById("yellow");
var blackCheck = window.document.getElementById("black");
var channelChecks = window.document.getElementById("channelChecks");
var gamut = window.document.getElementById("gamut");
var sliderInput = window.document.getElementById("sliderInput");
var sliderRange = window.document.getElementById("sliderRange");
/*var xButton = window.document.getElementById("x");
var divLabels = window.document.getElementById("labels");
var divInput = window.document.getElementById("input");

xButton.onclick = function(){
  for(var x=0; x<divLabels.children.length; x++){
    if(divLabels.children[x].className == "visible"){
      divLabels.children[x].className = "hidden";
    } else if(divLabels.children[x].className == "hidden"){
      divLabels.children[x].className = "visible";
    }
  }
  for(var x=0; x<divInput.children.length; x++){
    if(divInput.children[x].className == "visible"){
      divInput.children[x].className = "hidden";
    } else if(divInput.children[x].className == "hidden"){
      divInput.children[x].className = "visible";
    }
  }
  var extID = "com.indyimaging.swatchmakersmall";
  var params = {};
  csInterface.requestOpenExtension( extID, params );
  csInterface.closeExtension();
}*/

//Run swatches() on button click or on pressing Enter with swatch input field active
swatchButton.onclick = function() { swatches(); }
swatchInput.onkeyup = function(event) { if(event.keyCode == 13) swatches(); }

//swatches() pulls data entered in all fields and sends it to the appropriate function in the JSX script
function swatches(){
    var stepRange = sliderRange.value;
    var adjustmentColors = []; //Variable to hold channels that will be adjusted, or undefined on atuomatically adjusted channels
    //For every <input type="checkbox"> node, push its id to adjustmentColors if it is checked and enabled
    for(var i=0; i<channelChecks.children.length; i++){
      if(channelChecks.children[i].nodeName = "INPUT" && channelChecks.children[i].checked && channelChecks.children[i].disabled == false){
        adjustmentColors.push(channelChecks.children[i].id);
      }
    }
    //Fill any blank parts of array with undefined (which will use defaults)
    if(adjustmentColors.length == 0) adjustmentColors.push(undefined);
    if(adjustmentColors.length == 1) adjustmentColors.push(undefined);
    var colorsArray = colorSubmit.value.replace(/^\s+/,"").split(/,+\s*/); //Remove leading whitespace, split at commas into an array
    var colorsArrayString = JSON.stringify(colorsArray);
    var adjustmentColorsString = JSON.stringify(adjustmentColors);
    if(swatchTypePMS.value == "pms") {
      csInterface.evalScript('pmsSwatches(' + colorsArrayString + ',\"' + gamut.value + '\",' + stepRange + ',' + adjustmentColorsString + ')');
    }
    if(swatchTypePMS.value == "cmyk") {
      csInterface.evalScript('cmykSwatches(' + colorsArrayString + ',\"' + gamut.value + '\",' + stepRange + ',' + adjustmentColorsString + ')');
    }
}

autoCheck.onclick = function(){
  if(autoCheck.checked){
    cyanCheck.disabled = true;
    magentaCheck.disabled = true;
    yellowCheck.disabled = true;
    blackCheck.disabled = true;
  } else {
    cyanCheck.disabled = false;
    magentaCheck.disabled = false;
    yellowCheck.disabled = false;
    blackCheck.disabled = false;
    checkForTwoChecks();
  }
}

sliderInput.onchange = function(){
  if(Number(sliderInput.value)>10){
    sliderInput.value = 10;
  } else if (Number(sliderInput.value) <= 0 || Number(sliderInput.value) == NaN){
    sliderInput.value = 1;
  }
  sliderRange.value = sliderInput.value;
}

//Make sure only two channel checkboxes can be selected
cyanCheck.onclick = function(){
  checkForTwoChecks();
}
yellowCheck.onclick = function(){
  checkForTwoChecks();
}
magentaCheck.onclick = function(){
  checkForTwoChecks();
}
blackCheck.onclick = function(){
  checkForTwoChecks();
}

function checkForTwoChecks(){
  var c = 0;
  for(var i=0; i<channelChecks.children.length; i++){
    if(channelChecks.children[i].nodeName = "INPUT" && channelChecks.children[i].checked){
      c++;
    }
  }
  if(c >= 2){
    for(var i=0; i<channelChecks.children.length; i++){
      if(channelChecks.children[i].nodeName = "INPUT" && !channelChecks.children[i].checked){
        channelChecks.children[i].disabled = true;
      }
    }
  } else {
    for(var i=0; i<channelChecks.children.length; i++){
      if(channelChecks.children[i].nodeName = "INPUT") {
        channelChecks.children[i].disabled = false;
      }
    }
  }
}
