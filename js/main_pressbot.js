//themeManager sets CSS to match user's settings
//(c) David Deraedt @ https://github.com/davidderaedt/CC-EXT-SDK/tree/master/templates/theme
themeManager.init();

//----- CONSTRUCTORS -----//

//LineItem object constructor - this object holds all finishing information for each line item. This will be sent to JSX file on completion.
function LineItem(path, name, quantity, nesting, finishedHeight, finishedWidth, cutOffset, useDocumentArtboard, grommetStatus, grommetSpacing, grommetByNumber, pocketStatus, pocketSize, rotation, artworkObject) {
    this.path = path;
    this.name = name;
    this.quantity = quantity;
    this.nesting = nesting; //"Yes" or "No"
    this.finishedHeight = finishedHeight;
    this.finishedWidth = finishedWidth;
    this.cutOffset = cutOffset; //array [top, bottom, left, right]
    this.useDocumentArtboard = useDocumentArtboard;
    this.grommetStatus = grommetStatus; //boolean
    this.grommetSpacing = grommetSpacing; //array [top, bottom, left, right]
    this.grommetByNumber = grommetByNumber; //array to determine if grommets are placed by number(=1) or distance(=0), array in order of [vertical, horizontal]
    this.pocketStatus = pocketStatus; //boolean
    this.pocketSize = pocketSize; //array [top, bottom, left, right]
    this.rotation = rotation;
    this.artworkObject = artworkObject; //Artwork object for this line item
}

//PrintSettings object constructor - this object holds information which applies to all line items
function PrintSettings(source, scale, regMarkSpacing, zundCut, materialWidth, materialHeight, rigid, perimPadding, save, closeSource, perimStroke){
    this.source = source; //info from source panel, one of "active", "all", or "external"
    this.scale = scale;
    this.regMarkSpacing = regMarkSpacing;
    this.zundCut = zundCut; //boolean
    this.materialWidth = materialWidth;
    this.materialHeight = materialHeight;
    this.rigid = rigid; //Print material is rigid
    this.perimPadding = perimPadding; //array [top&bottom, left&right]
    this.save = save; //boolean
    this.closeSource = closeSource;
    this.perimStroke = perimStroke;
}

//----- GLOBAL VARIABLES & HTML ELEMENTS -----//

var clearOnProduceCheck = false;
var closeSourceOnProduceCheck = false;
var alertOnMaterialCheck = false;
var csInterface = new CSInterface(); //CS Interface
var openFiles = []; //Array just that keeps track of what files are open, so you don't have to loop through LineItem objects
var allLineItems = []; //Array of LineItem objects, with finishing information for each line item
var printSettings; //PrintSettings object
var flyoutObject;
var sourceList = document.getElementById("selectSource"); //<select> field, list of files to process
var addFilesButton = document.getElementById("add"); //+ button, imports files to sourceList
var removeFilesButton = document.getElementById("remove"); //- button, removes files from sourceList
var allOpenFilesButton = document.getElementById("allOpen"); //Opened button, add files to sourceList that are open in AI
var nestFilesButton = document.getElementById("nest");
var unnestFilesButton = document.getElementById("unnest");
var finishedDimensions = document.getElementById("finDims");
var finishingDiv = document.getElementById("finishingDiv");
//var artboardBleedSelect = document.getElementById("bleed");
//var finHeightInput = document.getElementById("finHeight");
//var finWidthInput = document.getElementById("finWidth");
//var useArtboardCheck = document.getElementById("useArtboard");
var offsetTopInput = document.getElementById("offsetTop");
var offsetBottomInput = document.getElementById("offsetBottom");
var offsetLeftInput = document.getElementById("offsetLeft");
var offsetRightInput = document.getElementById("offsetRight");
var offsetConstButton = document.getElementById("offsetConstrain");
var offsetConstStatus = false;
var gromTopInput = document.getElementById("gromTop");
var gromBottomInput = document.getElementById("gromBottom");
var gromLeftInput = document.getElementById("gromLeft");
var gromRightInput = document.getElementById("gromRight");
var gromCheck = document.getElementById("gromCheck");
var gromVSpacingSelect = document.getElementById("gromVSpacing");
var gromHSpacingSelect = document.getElementById("gromHSpacing");
var pockTopInput = document.getElementById("pockTop");
var pockBottomInput = document.getElementById("pockBottom");
var pockLeftInput = document.getElementById("pockLeft");
var pockRightInput = document.getElementById("pockRight");
var pockCheck = document.getElementById("pockCheck");
var quantityInput = document.getElementById("quantity");
var rotationCheck = document.getElementById("rotate");
var gromConstButton = document.getElementById("gromConstrain");
var gromConstStatus = false;
var pockConstButton = document.getElementById("pockConstrain");
var pockConstStatus = false;
var matHeightInput = document.getElementById("matHeight");
var matWidthInput = document.getElementById("matWidth");
var matTypeSelect = document.getElementById("matType");
var regDensity = document.getElementById("regDensity");
var perimPaddingTB = document.getElementById("perimPaddingTB");
var perimPaddingLR = document.getElementById("perimPaddingLR");
var scaleInput = document.getElementById("scale");
var zundCheck = document.getElementById("zund");
var saveCheck = document.getElementById("saveOut");
var perimStrokeCheck = document.getElementById("perimStroke");
var applyButton = document.getElementById("apply");
var confirmButton = document.getElementById("confirm");
var cancelButton = document.getElementById("cancel");

var xmlhttp = new XMLHttpRequest(); //HTTP Request object
try {
  xmlhttp.open("GET", "./js/flyout_default.json", false);
  xmlhttp.send();
  flyoutObject = JSON.parse(xmlhttp.responseText); //Parse text data retreived from server as JSON
} catch(x) {
  alert(x);
}
clearOnProduceCheck = flyoutObject.clearOnProduceCheck;
closeSourceOnProduceCheck = flyoutObject.closeSourceOnProduceCheck;
alertOnMaterialCheck = flyoutObject.alertOnMaterialCheck;
var flyoutXML = '\
<Menu> \
  <MenuItem Id="saveAsDefault" Label="Save Settings as Default" Enabled="false" Checked="false"/> \
  \
  <MenuItem Label="---" /> \
  \
  <MenuItem Id="clearOnProduce" Label="Clear Fields on Produce" Enabled="true" Checked="' + clearOnProduceCheck + '"/> \
  <MenuItem Id="closeSourceOnProduce" Label="Close Source Files on Produce" Enabled="true" Checked="' + closeSourceOnProduceCheck + '"/> \
  <MenuItem Id="alertOnMaterial" Label="Alert on Material Discrepancy" Enabled="true" Checked="' + alertOnMaterialCheck + '"/> \
</Menu>'; //settings for flyout menu must be saved as XML

//----- FUNCTIONS -----//

function importFiles(files){
  if(files != "undefined" && files != ""){
    //Get paths for all files
    files.split(',').forEach(function(element, index, array){
      //If called by eventListener (since it fires anytime focus changes), check to confirm that file is not already in sourceList
      if(openFiles.indexOf(element) == -1){
        var newLineItem = createLineItem(array[index]); //Create LineItem object
        if(newLineItem) {
          allLineItems.push( newLineItem ); //If an object is returned, add it to array
          openFiles.push(array[index]); //Add path to openFiles
        }
      }
    });
    updateList(allLineItems);
    //updateFields(allLineItems[allLineItems.length-1]);
  }
}

//Function to initialize new LineItem objects with values from server
function createLineItem( path ){
  var lineItemExt, lineItemDefault, printSettingsDefault, lineItem;
  var name = path.substr((path.lastIndexOf('/')+1)); //Format name
  var xmlhttp = new XMLHttpRequest(); //HTTP Request object
  try{
    xmlhttp.open("GET", "http://apps.indyimaging.com/ang/data/prepress/prepress_api/index/?format=json&orderDashNum=" + name, false);
    xmlhttp.send();
    lineItemExt = JSON.parse(xmlhttp.responseText); //Parse text data retreived from server as JSON
  } catch(e) {
    //On failure, get default line item & print settings from local machine
    try {
      xmlhttp.open("GET", "./js/lineitem_default.json", false);
      xmlhttp.send();
      lineItemDefault = JSON.parse(xmlhttp.responseText); //Parse text data retreived from server as JSON
    } catch(x) {
      alert(x);
    }
  }
  //If JSON data is valid (line item exits), create new LineItem object based on JSON data
  if (lineItemExt && typeof lineItemExt == "object"){
    lineItem = new LineItem(
      path, //path
      name, //name
      Number(lineItemExt.n_Quantity), //quantity
      false, //nesting
      Number(lineItemExt.n_HeightInInches) + Number(lineItemExt.n_BleedTop) + Number(lineItemExt.n_BleedBottom) + Number(lineItemExt.n_WhiteTop) + Number(lineItemExt.n_WhiteBottom), //finished height
      Number(lineItemExt.n_WidthInInches) + Number(lineItemExt.n_BleedLeft) + Number(lineItemExt.n_BleedRight) + Number(lineItemExt.n_WhiteLeft) + Number(lineItemExt.n_WhiteRight), //finished width
      [0,0,0,0], //cut offset
      false, //document artboard
      false, //grommet status
      [24,24,24,24], //grommet spacing
      [0, 0],
      (Number(lineItemExt.n_PocketTop) || Number(lineItemExt.n_PocketBottom) || Number(lineItemExt.n_PocketLeft) || Number(lineItemExt.n_PocketRight)) > 0 ? true : false, //pocket status
      [Number(lineItemExt.n_PocketTop), Number(lineItemExt.n_PocketBottom), Number(lineItemExt.n_PocketLeft), Number(lineItemExt.n_PocketRight)], //pocket size
      false, //rotation
      undefined
    );
    //If printSettings has not been defined, create it
    if(!printSettings) {
      printSettings = createPrintSettings();
      printSettings.materialWidth = Number(lineItemExt.n_AttribHeight);
      if(lineItemExt.t_AttribWidthUOM == "\"") {
        printSettings.materialHeight = Number(lineItemExt.n_AttribHeight);
        printSettings.materialWidth = Number(lineItemExt.n_AttribWidth);
        printSettings.rigid = true;
      } else {
        printSettings.rigid = false;
      }
      updatePrintFields( printSettings );
    //If printSettings has been defined, check it against JSON data and call out discrepancies
    //Return null if user does not ignore discrepancies
    } if(printSettings && alertOnMaterialCheck) {
      if (lineItemExt.t_AttribWidthUOM == "\'" && printSettings.materialWidth != Number(lineItemExt.n_AttribHeight)){
        var override = confirm("Existing material size does not match material size for " + lineItem.name + ". Continue anyway?");
        if(!override) return null;
      }
      if (lineItemExt.t_AttribWidthUOM == "\"" && (printSettings.materialWidth != Number(lineItemExt.n_AttribWidth) || printSettings.materialHeight != Number(lineItemExt.n_AttribHeight)) ){
        //alert("printSettings.materialHeight=" + printSettings.materialHeight + " lineItemExt.n_AttribHeight=" + lineItemExt.n_AttribHeight);
        var override = confirm("Existing material size does not match material size for " + lineItem.name + ". Continue anyway?");
        if(!override) return null;
      }
    }
  } else {
    lineItem = new LineItem(
      path, //path
      name, //name
      lineItemDefault.quantity, //quantity
      lineItemDefault.nesting, //nesting
      lineItemDefault.finishedHeight, //finished height
      lineItemDefault.finishedWidth, //finished width
      lineItemDefault.cutOffset, //cut path/artboard offset
      lineItemDefault.useDocumentArtboard, //document artboard
      lineItemDefault.grommetStatus, //grommet status
      lineItemDefault.grommetSpacing, //grommet spacing
      lineItemDefault.grommetByNumber,
      lineItemDefault.pocketStatus, //pocket status
      lineItemDefault.pocketSize, //pocket size
      lineItemDefault.rotation, //rotation
      undefined
    );
    printSettings = createPrintSettings();
  }
  return lineItem;
}

function createPrintSettings(){
  var printSettingsDefault, printSettings;
  var xmlhttp = new XMLHttpRequest(); //HTTP Request object
  //Load preset print settings from local machine
  try {
    xmlhttp.open("GET", "./js/printsettings_default.json", false);
    xmlhttp.send();
    printSettingsDefault = JSON.parse(xmlhttp.responseText); //Parse text data retreived from server as JSON
  } catch(x) {
    alert(x);
  }
  //Apply JSON settings to new PrintSettings object
  printSettings = new PrintSettings(
    "",
    printSettingsDefault.scale || "",
    printSettingsDefault.regMarkSpacing || "",
    printSettingsDefault.zundCut || "",
    printSettingsDefault.materialWidth || "",
    printSettingsDefault.materialHeight || "",
    printSettingsDefault.rigid || "",
    printSettingsDefault.perimPadding || [],
    printSettingsDefault.save || "",
    printSettingsDefault.closeSource || "",
    printSettingsDefault.perimStroke || ""
  );
  //Update printSettings fields
  updatePrintFields( printSettings );
  return printSettings;
}

function updateList( allLines ){
  var displayName, lineItemOption, nestOpt;
  //Empty sourceList to prep for repopulation
  sourceList.length = 0;
  if(document.getElementById("nestOpt")) sourceList.removeChild(document.getElementById("nestOpt"));
  //Cycle through line items, placing them in the sourceList according to nesting
  for(var i=0;i<allLines.length;i++){
    //Format name for display in sourceList
    displayName = allLines[i].name.substr((allLines[i].name.lastIndexOf('/')+1));
    //Add new Option for LineItem to sourceList
    lineItemOption = new Option( displayName, displayName );
    //If this line item is nested, place it in the Nesting <optgroup>
    if(allLines[i].nesting == true){
      //If there is no Nesting <optgroup>, create one
      if(!document.getElementById("nestOpt")){
        nestOpt = document.createElement("OPTGROUP"); //Create new <optgroup>
        nestOpt.setAttribute("label","Nested");
        nestOpt.setAttribute("id", "nestOpt");
        sourceList.insertBefore(nestOpt, sourceList.options[0]); //Place it at the top of the list
      }
      nestOpt.insertBefore(lineItemOption, nestOpt.childNodes[nestOpt.childNodes.length]); //Place selected <option> at the top of the <optgroup>
    } else if(allLines[i].nesting == false) {
      sourceList.appendChild(lineItemOption);
    }
  }
  if(sourceList.length > 0){
    sourceList[sourceList.length-1].selected = true;
    updateFields(allLines[allLines.length-1]);
    csInterface.updatePanelMenuItem("Save Settings as Default", true, false);
  }
}

function updateFields( lineItem ){
  if(lineItem){
    finishedDimensions.innerHTML = Math.round(lineItem.finishedHeight * 1000)/1000 + "\" H x " + Math.round(lineItem.finishedWidth * 1000)/1000 + "\" W";
    /*artboardBleedSelect.value = lineItem.cutOffset;
    if(useArtboardCheck.checked != lineItem.useDocumentArtboard){
      useArtboardCheck.checked = lineItem.useDocumentArtboard;
      artboardToggle();
    }*/
    offsetTopInput.value = lineItem.cutOffset[0] || 0;
    offsetBottomInput.value = lineItem.cutOffset[1] || 0;
    offsetLeftInput.value = lineItem.cutOffset[2] || 0;
    offsetRightInput.value = lineItem.cutOffset[3] || 0;
    gromTopInput.value = lineItem.grommetSpacing[0] || 0;
    gromBottomInput.value = lineItem.grommetSpacing[1] || 0;
    gromLeftInput.value = lineItem.grommetSpacing[2] || 0;
    gromRightInput.value = lineItem.grommetSpacing[3] || 0;
    if(gromCheck.checked != lineItem.grommetStatus) {
      gromCheck.checked = lineItem.grommetStatus;
      grommetToggle();
    }
    pockTopInput.value = lineItem.pocketSize[0] || 0;
    pockBottomInput.value = lineItem.pocketSize[1] || 0;
    pockLeftInput.value = lineItem.pocketSize[2] || 0;
    pockRightInput.value = lineItem.pocketSize[3] || 0;
    if(pockCheck.checked != lineItem.pocketStatus) {
      pockCheck.checked = lineItem.pocketStatus;
      pocketToggle();
    }
    quantityInput.value = lineItem.quantity || "";
    rotationCheck.checked = lineItem.rotation || false;
  } else {
    finishedDimensions.innerHTML = "";
    //finHeightInput.value = "";
    //finWidthInput.value = "";
    //artboardBleedSelect.value = 0;
    offsetTopInput.value = "";
    offsetBottomInput.value = "";
    offsetLeftInput.value = "";
    offsetRightInput.value = "";
    if(gromCheck.checked == true) {
      grommetToggle();
      gromCheck.checked = false;
    }
    gromTopInput.value = "";
    gromBottomInput.value = "";
    gromLeftInput.value = "";
    gromRightInput.value = "";
    if(pockCheck.checked == true) {
      pocketToggle();
      pockCheck.checked = false;
    }
    pockTopInput.value = "";
    pockBottomInput.value = "";
    pockLeftInput.value = "";
    pockRightInput.value = "";
    gromVSpacingSelect.value = "distance";
    gromHSpacingSelect.value = "distance";
    quantityInput.value = "";
    rotationCheck.checked = false;
  }
}

function updatePrintFields( printSettings ){
  if(printSettings){
    printSettings.rigid == false ? matTypeSelect.value = "roll" : matTypeSelect.value = "rigid";
    printSettings.rigid == false ? matHeightInput.disabled = true : matHeightInput.disabled = false;
    if(matHeightInput.disabled == false) matHeightInput.value = printSettings.materialHeight;
    matWidthInput.value = printSettings.materialWidth;
    regDensity.value = printSettings.regMarkSpacing;
    perimPaddingLR.checked = printSettings.perimPadding[0];
    perimPaddingTB.checked = printSettings.perimPadding[1];
    scaleInput.value = printSettings.scale;
    perimStrokeCheck.checked = printSettings.perimStroke;
    zundCheck.checked = printSettings.zundCut;
    saveCheck.checked = printSettings.save;
  } else {
    matHeightInput.value = "";
    matWidthInput.value = "";
    scaleInput.value = "";
  }
}

function updateLineItem( lineItem ){
  //lineItem.finishedHeight = Number(finHeightInput.value);
  //lineItem.finishedWidth = Number(finWidthInput.value);
  //lineItem.cutOffset = Number(artboardBleedSelect.value);
  //lineItem.finishedWidth = Number(artboardBleedSelect.value);
  //lineItem.useDocumentArtboard = useArtboardCheck.checked;
  lineItem.cutOffset[0] = Number(offsetTopInput.value);
  lineItem.cutOffset[1] = Number(offsetBottomInput.value);
  lineItem.cutOffset[2] = Number(offsetLeftInput.value);
  lineItem.cutOffset[3] = Number(offsetRightInput.value);
  lineItem.grommetSpacing[0] = Number(gromTopInput.value);
  lineItem.grommetSpacing[1] = Number(gromBottomInput.value);
  lineItem.grommetSpacing[2] = Number(gromLeftInput.value);
  lineItem.grommetSpacing[3] = Number(gromRightInput.value);
  lineItem.grommetStatus = gromCheck.checked;
  lineItem.grommetByNumber = [gromVSpacingSelect.selectedIndex, gromHSpacingSelect.selectedIndex];
  lineItem.pocketSize[0] = Number(pockTopInput.value);
  lineItem.pocketSize[1] = Number(pockBottomInput.value);
  lineItem.pocketSize[2] = Number(pockLeftInput.value);
  lineItem.pocketSize[3] = Number(pockRightInput.value);
  lineItem.pocketStatus = pockCheck.checked;
  lineItem.quantity = Number(quantityInput.value);
  lineItem.rotation = rotationCheck.checked;
}

function updatePrintSettings( printSettings ){
  if(printSettings){
    if (scaleInput.value != "") printSettings.scale = Number(scaleInput.value);
    printSettings.zundCut = zundCheck.checked;
    if (matWidthInput.value != "") printSettings.materialWidth = matWidthInput.value;
    if (matHeightInput.value != "") printSettings.materialHeight = matHeightInput.value;
    if (matTypeSelect.value != "rigid") printSettings.materialHeight = 126;
    matTypeSelect.value == "rigid" ? printSettings.rigid = true : printSettings.rigid = false;
    printSettings.regMarkSpacing = regDensity.value;
    printSettings.perimPadding[0] = perimPaddingTB.checked;
    printSettings.perimPadding[1] = perimPaddingLR.checked;
    printSettings.perimStroke = perimStrokeCheck.checked;
    printSettings.save = saveCheck.checked;
    printSettings.closeSource = closeSourceOnProduceCheck;
  }
}

function clear(){
  sourceList.length = 0;
  openFiles = [];
  allLineItems = [];
  printSettings = undefined;
  updateList(allLineItems);
  updateFields();
  updatePrintFields();
  csInterface.updatePanelMenuItem("Save Settings as Default", false, false);
}

/*function artboardToggle(){
  finHeightInput.disabled = !finHeightInput.disabled;
  finWidthInput.disabled = !finWidthInput.disabled;
}*/

function grommetToggle(){
  gromTopInput.disabled = !gromTopInput.disabled;
  if(!gromConstStatus){
    gromBottomInput.disabled = !gromBottomInput.disabled;
    gromLeftInput.disabled = !gromLeftInput.disabled;
    gromRightInput.disabled = !gromRightInput.disabled;
    gromHSpacingSelect.disabled = !gromHSpacingSelect.disabled;
  }
  gromConstButton.disabled = !gromConstButton.disabled;
  gromVSpacingSelect.disabled = !gromVSpacingSelect.disabled;
}

function pocketToggle(){
  pockTopInput.disabled = !pockTopInput.disabled;
  if(!pockConstStatus){
    pockBottomInput.disabled = !pockBottomInput.disabled;
    pockLeftInput.disabled = !pockLeftInput.disabled;
    pockRightInput.disabled = !pockRightInput.disabled;
  }
  pockConstButton.disabled = !pockConstButton.disabled;
}

function saveAsDefault(){
  var lineItemToString, printSettingsToString; //To hold strings to save to file
  //Get selected line item
  for(var x=sourceList.length-1;x>=0;x--){
    if(sourceList.options[x].selected){
      for(var z=allLineItems.length-1;z>=0;z--){
        if(sourceList.options[x].value == allLineItems[z].name)
          lineItemToString = allLineItems[z];
          break;
      }
    }
  }
  lineItemToString.path = "";
  lineItemToString.name = "";
  updatePrintSettings( printSettings );
  lineItemToString = JSON.stringify(lineItemToString); //stringify line item object to be saved to file
  printSettingsToString = JSON.stringify(printSettings); //stringify print settings object to be saved to file
  //Load node.js modules for writing to files
  var fs = require('fs');
  var path = require('path');
  var linePath = path.join(__dirname, '/js/lineitem_default.json'); //For some reason the full path is needed
  fs.writeFileSync(linePath, lineItemToString);
  var printPath = path.join(__dirname, '/js/printsettings_default.json');
  fs.writeFileSync(printPath, printSettingsToString);
}

function saveFlyout( param, state ){
  var flyoutObjectToString;
  flyoutObject[param] = state;
  flyoutObjectToString = JSON.stringify(flyoutObject);
  var fs = require('fs');
  var path = require('path');
  var linePath = path.join(__dirname, '/js/flyout_default.json');
  fs.writeFileSync(linePath, flyoutObjectToString);
}

//Returns an array of all selected <option>s in a specified <select> element
//Not really using it right now though
function getSelected(multiList){
  var selected = [];
  for(var x=0;x<multiList.length;x++){
    if(multiList.options[x].selected){
      selected.push(multiList.options[x])
    }
  }
  return selected;
}

//----- EVENT HANDLING -----//

//Load default print settings
//printSettings = createPrintSettings();
//Add files to list upon opening Illustrator
//csInterface.evalScript('getOpenFiles()', importFiles);

//When new files are opened, add them to openFiles and sourceList
//Removing this for now
/*csInterface.addEventListener("documentAfterActivate", function(event){
  csInterface.evalScript("getOpenFiles()", importFiles);
});*/

csInterface.setPanelFlyoutMenu(flyoutXML); //Activate flyout
csInterface.addEventListener("com.adobe.csxs.events.flyoutMenuClicked", function(event){
  if(event.data.menuId == "saveAsDefault") saveAsDefault();
  if(event.data.menuId == "clearOnProduce"){
    clearOnProduceCheck = !clearOnProduceCheck;
    csInterface.updatePanelMenuItem("Clear Fields on Produce", true, clearOnProduceCheck);
    saveFlyout("clearOnProduceCheck", clearOnProduceCheck);
  }
  if(event.data.menuId == "closeSourceOnProduce"){
    closeSourceOnProduceCheck = !closeSourceOnProduceCheck;
    csInterface.updatePanelMenuItem("Close Source Files on Produce", true, closeSourceOnProduceCheck);
    saveFlyout("closeSourceOnProduceCheck", closeSourceOnProduceCheck);
  }
  if(event.data.menuId == "alertOnMaterial"){
    alertOnMaterialCheck = !alertOnMaterialCheck;
    csInterface.updatePanelMenuItem("Alert on Material Discrepancy", true, alertOnMaterialCheck);
    saveFlyout("alertOnMaterialCheck", alertOnMaterialCheck);
  }
});

//Add listeners to finishing <input>s to disable Produce <button> when changed
for(var i=0;i<finishingDiv.children.length;i++){
  for(var j=0;j<finishingDiv.children[i].children.length;j++){
    if(finishingDiv.children[i].children[j].type == "text"){
      finishingDiv.children[i].children[j].addEventListener("input", function(){
        if(allLineItems.length > 0) confirmButton.disabled = true;
      });
    }
    if(finishingDiv.children[i].children[j].nodeName == "SELECT" || finishingDiv.children[i].children[j].type == "checkbox"
      || finishingDiv.children[i].children[j].id == "gromConstrain" || finishingDiv.children[i].children[j].id == "pockConstrain"){
      finishingDiv.children[i].children[j].addEventListener("click", function(){
        if(allLineItems.length > 0) confirmButton.disabled = true;
      });
    }
  }
}

//Add files to list when clicking Add Files (+) <button>
addFilesButton.onclick = function(){
  csInterface.evalScript('addFiles()', importFiles);
}

//Remove files to list when clicking Remove Files (-) <button>
removeFilesButton.onclick = function(){
  for(var x=sourceList.length-1;x>=0;x--){
    if(sourceList.options[x].selected){
      for(var z=allLineItems.length-1;z>=0;z--){
        if(sourceList.options[x].value == allLineItems[z].name)
          allLineItems.splice(z, 1);
          openFiles.splice(z, 1);
      }
    }
  }
  if(allLineItems.length == 0) {
    clear();
  } else {
    updateList(allLineItems);
  }
}

//Add all opened files to list when clicking Opened <button>
allOpenFilesButton.onclick = function(){
  csInterface.evalScript('getOpenFiles()', importFiles);
}

//Add files to Nesting <optgroup>
nestFilesButton.onclick = function(){
  for(var n=0;n<sourceList.length;n++){
    if(sourceList.options[n].selected) {
      for(var m=0;m<allLineItems.length;m++){
        if(allLineItems[m].name == sourceList.options[n].value) {
          allLineItems[m].nesting = true;
        }
      }
    }
  }
  updateList(allLineItems);
}

//Remove files from Nesting <optgroup>
unnestFilesButton.onclick = function(){
  for(var n=0;n<sourceList.length;n++){
    if(sourceList.options[n].selected) {
      for(var m=0;m<allLineItems.length;m++){
        if(allLineItems[m].name == sourceList.options[n].value) {
          allLineItems[m].nesting = false;
        }
      }
    }
  }
  updateList(allLineItems);
}

//Update fields according to sourceList <select>
sourceList.onchange = function(){
  for(var n=0;n<sourceList.length;n++){
    if(sourceList.options[n].selected) {
      for(var m=0;m<allLineItems.length;m++){
        if(allLineItems[m].name == sourceList.options[n].value) {
          updateFields(allLineItems[m]);
        }
      }
    }
  }
}

//Apply fields to selected LineItem object(s)
applyButton.onclick = function(){
  for(var n=0;n<sourceList.length;n++){
    if(sourceList.options[n].selected) {
      for(var m=0;m<allLineItems.length;m++){
        if(allLineItems[m].name == sourceList.options[n].value) {
          updateLineItem(allLineItems[m]);
        }
      }
    }
  }
  confirmButton.disabled = false;
}

//Collect data, stringify, and send it to JSX file
confirmButton.onclick = function(){
  var userInput = [];
  //applyButton.click();
  updatePrintSettings(printSettings);
  userInput.push(allLineItems);
  userInput.push(printSettings);
  jsonToJSX = JSON.stringify(userInput);
  csInterface.evalScript('processFinishing(\'' + jsonToJSX + '\')');
  if(clearOnProduceCheck) clear();
}

//Call function to clear fields
cancelButton.onclick = function(){
  clear();
}

offsetConstButton.onclick = function(){
  if(offsetConstStatus == false){
    offsetConstStatus = true;
    offsetConstButton.className = "constrain_enabled";
    offsetBottomInput.value = offsetTopInput.value;
    offsetLeftInput.value = offsetTopInput.value;
    offsetRightInput.value = offsetTopInput.value;
    offsetBottomInput.disabled = true;
    offsetLeftInput.disabled = true;
    offsetRightInput.disabled = true;
  } else {
    offsetConstStatus = false;
    offsetConstButton.className = "constrain_disabled";
    offsetBottomInput.disabled = false;
    offsetLeftInput.disabled = false;
    offsetRightInput.disabled = false;
  }
}

offsetTopInput.oninput = function(){
  if(offsetConstStatus == true){
    offsetBottomInput.value = offsetTopInput.value;
    offsetLeftInput.value = offsetTopInput.value;
    offsetRightInput.value = offsetTopInput.value;
  }
}

gromVSpacingSelect.onchange = function(){
  if(gromConstStatus == true){
    gromHSpacingSelect.value = gromVSpacingSelect.value;
  }
}

gromTopInput.oninput = function(){
  if(gromConstStatus == true){
    gromBottomInput.value = gromTopInput.value;
    gromLeftInput.value = gromTopInput.value;
    gromRightInput.value = gromTopInput.value;
  }
}

gromConstButton.onclick = function(){
  if(gromConstStatus == false){
    gromConstStatus = true;
    gromConstButton.className = "constrain_enabled";
    gromBottomInput.value = gromTopInput.value;
    gromLeftInput.value = gromTopInput.value;
    gromRightInput.value = gromTopInput.value;
    gromHSpacingSelect.value = gromVSpacingSelect.value;
    gromBottomInput.disabled = true;
    gromLeftInput.disabled = true;
    gromRightInput.disabled = true;
    gromHSpacingSelect.disabled = true;
  } else {
    gromConstStatus = false;
    gromConstButton.className = "constrain_disabled";
    gromBottomInput.disabled = false;
    gromLeftInput.disabled = false;
    gromRightInput.disabled = false;
    gromHSpacingSelect.disabled = false;
  }
}

pockTopInput.oninput = function(){
  if(pockConstStatus == true){
    pockBottomInput.value = pockTopInput.value;
    pockLeftInput.value = pockTopInput.value;
    pockRightInput.value = pockTopInput.value;
  }
}

pockConstButton.onclick = function(){
  if(pockConstStatus == false){
    pockConstStatus = true;
    pockConstButton.className = "constrain_enabled";
    pockBottomInput.value = pockTopInput.value;
    pockLeftInput.value = pockTopInput.value;
    pockRightInput.value = pockTopInput.value;
    pockBottomInput.disabled = true;
    pockLeftInput.disabled = true;
    pockRightInput.disabled = true;
  } else {
    pockConstStatus = false;
    pockConstButton.className = "constrain_disabled";
    pockBottomInput.disabled = false;
    pockLeftInput.disabled = false;
    pockRightInput.disabled = false;
  }
}

matTypeSelect.onchange = function(){
  if (matTypeSelect.value == "roll"){
    matHeightInput.disabled = true;
    matHeightInput.value = "";
  } else {
    matHeightInput.disabled = false;
    matHeightInput.value = printSettings.materialHeight;
  }
}

/*useArtboardCheck.onclick = function(){
  finHeightInput.disabled = !finHeightInput.disabled;
  finWidthInput.disabled = !finWidthInput.disabled;
}*/

gromCheck.onclick = function(){
  grommetToggle();
}

pockCheck.onclick = function(){
  pocketToggle();
}
