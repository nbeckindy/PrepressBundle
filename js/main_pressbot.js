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

//PrintSettings object constructor - this object holds information which applies to all line items, also sent to JSX file.
function PrintSettings(source, scale, regMarkSpacing, zundCut, materialWidth, materialHeight, rigid, perimPadding, save, closeSource, perimStroke){
    this.source = source; //remnant from old versions, no longer used
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

var csInterface = new CSInterface(); //CS Interface object, used for various extension needs
var xmlhttp = new XMLHttpRequest(); //HTTP Request object
//var openFiles = []; //Array that just keeps track of what files are loaded, so you don't have to loop through LineItem objects
var allLineItems = []; //Array of all LineItem objects that have been loaded, updated when "Apply Settings" is selected
var printSettings; //future PrintSettings object, must remain undefined on declaration
var flyoutObject = {}; //Flyout menu settings object
var configPath = csInterface.getSystemPath(SystemPath.USER_DATA) + "/Adobe/Adobe Illustrator 18/en_US/"; //Location in User's Library where config files are saved
var appVersion = csInterface.hostEnvironment.appVersion; //To be used later, to determine folder when differing versions are used

//The rest of these are just mapping various HTML input elements to variables
var sourceList = document.getElementById("selectSource"); //<select> field, list of files to process
var addFilesButton = document.getElementById("add"); //"+" button, imports files to sourceList
var removeFilesButton = document.getElementById("remove"); //"-" button, removes files from sourceList
var allOpenFilesButton = document.getElementById("allOpen"); //"Opened" button, add files to sourceList that are open in AI
var nestFilesButton = document.getElementById("nest"); //"Add" button, to include file in the nesting queue
var unnestFilesButton = document.getElementById("unnest"); //"Drop" button, to remove file from nesting queue
var finishedDimensions = document.getElementById("finDims"); //Read-only text, displays finished size from shopBot
var finishingDiv = document.getElementById("finishingDiv"); //<div> that contains all the LineItem finishing options
//Line Item finishing fields
//Cut offset fields and constrain button (deactivated by default)
var offsetTopInput = document.getElementById("offsetTop");
var offsetBottomInput = document.getElementById("offsetBottom");
var offsetLeftInput = document.getElementById("offsetLeft");
var offsetRightInput = document.getElementById("offsetRight");
var offsetConstButton = document.getElementById("offsetConstrain");
var offsetConstStatus = false;
//Grommet spacing fields, spacing dropdown (default value "Distance") and constrain button (deactived by default)
var gromTopInput = document.getElementById("gromTop");
var gromBottomInput = document.getElementById("gromBottom");
var gromLeftInput = document.getElementById("gromLeft");
var gromRightInput = document.getElementById("gromRight");
var gromCheck = document.getElementById("gromCheck");
//<select> dropdowns tell the script how to interpret the numbers in the grommet fields, "Distance" or "Quantity"
var gromVSpacingSelect = document.getElementById("gromVSpacing");
var gromHSpacingSelect = document.getElementById("gromHSpacing");
var gromConstButton = document.getElementById("gromConstrain");
var gromConstStatus = false;
//Pocket size fields and constrain button (deactivated by default)
var pockTopInput = document.getElementById("pockTop");
var pockBottomInput = document.getElementById("pockBottom");
var pockLeftInput = document.getElementById("pockLeft");
var pockRightInput = document.getElementById("pockRight");
var pockCheck = document.getElementById("pockCheck");
var pockConstButton = document.getElementById("pockConstrain");
var pockConstStatus = false;
var quantityInput = document.getElementById("quantity"); //Quantity input field
var rotationCheck = document.getElementById("rotate"); //Rotate 90 degrees checkbox
var applyButton = document.getElementById("apply"); //<button> to apply all Line Item fields to selected LineItem object(s)
//Print Settings fields
var matHeightInput = document.getElementById("matHeight"); //Material height, from shopBot; disabled if matType is roll
var matWidthInput = document.getElementById("matWidth"); //Material width, from shopBot
var matTypeSelect = document.getElementById("matType"); //Material size <select> dropdown, "Rigid" or "Roll"
var regDensity = document.getElementById("regDensity"); //Regmark density <select> dropdown, "Low," "Medium" & "High"
var perimPaddingTB = document.getElementById("perimPaddingTB"); //<checkbox> for 1/2" perimeter padding, top & bottom
var perimPaddingLR = document.getElementById("perimPaddingLR"); //<checkbox> for 1/2" perimeter padding, left & right
var scaleInput = document.getElementById("scale"); //Scale input field, will generally be either 1, 10 or 100
var zundCheck = document.getElementById("zund"); //<checkbox> for if file will be set up for Zund
var saveCheck = document.getElementById("saveOut"); //<checkbox> for automatic saving of file
var perimStrokeCheck = document.getElementById("perimStroke"); //<checkbox> for 1px black stroke around artboard (best for D/S)
//Processing Buttons
var confirmButton = document.getElementById("confirm"); //<button> to send data to pressBot script to do everything
var cancelButton = document.getElementById("cancel"); //<button> that's actually called "Clear," empties all fields

//----- INITIALIZATION -----//

var fs = require('fs'); //Node file system API
//var path = require('path'); ///Node path

//Check if config files exist (flyout, lineitem, print) in configPath location
//If they don't, assign default values to the corresponding object, stringify, then save to disk
fs.exists(configPath + "flyout_config.json", function(exists){
  //If file does exist, open it and parse the JSON data
  if (exists){
    xmlhttp.open("GET", configPath + "flyout_config.json", false);
    xmlhttp.send();
    flyoutObject = JSON.parse(xmlhttp.responseText); //Parse text data retreived from server as JSON
  } else {
    flyoutObject.clearOnProduceCheck = false;
    flyoutObject.closeSourceOnProduceCheck = false;
    flyoutObject.alertOnMaterialCheck = false;
    var flyoutString = JSON.stringify(flyoutObject);
    fs.writeFile(configPath + "flyout_config.json", flyoutString, function(err){
      if (err) throw (err);
    });
  }
  setFlyout(); //Create flyout menu
});
fs.exists(configPath + "lineitem_config.json", function(exists){
  var lineItem = {};
  if (!exists){
    lineItem.quantity = 1;
    lineItem.nesting = false;
    lineItem.cutOffset = [0,0,0,0];
    lineItem.grommetStatus = true;
    lineItem.grommetSpacing = [24,24,24,24];
    lineItem.grommetByNumber = false;
    lineItem.pocketStatus= true;
    lineItem.pocketSize = [1.25,1.25,1.25,1.25];
    lineItem.rotation = false;
    var lineItemString = JSON.stringify(lineItem);
    fs.writeFile(configPath + "lineitem_config.json", lineItemString, function(err){
      if (err) throw (err);
    });
  }
});
fs.exists(configPath + "print_config.json", function(exists){
  var printSet = {};
  if (!exists){
    printSet.scale = 1;
    printSet.regMarkSpacing = 36;
    printSet.zundCut = true;
    printSet.materialWidth = 126;
    printSet.materialHeight = 50;
    printSet.rigid = false;
    printSet.perimPadding = [false, false];
    printSet.save = false;
    printSet.closeSource = false;
    printSet.perimStroke = false;
    var printSetString = JSON.stringify(printSet);
    fs.writeFile(configPath + "print_config.json", printSetString, function(err){
      if (err) throw (err);
    });
  }
});

//----- FUNCTIONS -----//

/*
  setFlyout()

  This function creates the flyout menu. It passes an XML string to csInterface.
  This is called on initializtion of the extension, after the flyOut object and
  its properties have been set either from disk or with default values. That is
  the only time it is called. No parameters.
*/

function setFlyout(){
  var flyoutXML = '\
  <Menu> \
    <MenuItem Id="saveAsDefault" Label="Save Settings as Default" Enabled="false" Checked="false"/> \
    \
    <MenuItem Label="---" /> \
    \
    <MenuItem Id="clearOnProduce" Label="Clear Fields on Produce" Enabled="true" Checked="' + flyoutObject.clearOnProduceCheck + '"/> \
    <MenuItem Id="closeSourceOnProduce" Label="Close Source Files on Produce" Enabled="true" Checked="' + flyoutObject.closeSourceOnProduceCheck + '"/> \
    <MenuItem Id="alertOnMaterial" Label="Alert on Material Discrepancy" Enabled="true" Checked="' + flyoutObject.alertOnMaterialCheck + '"/> \
  </Menu>';
  csInterface.setPanelFlyoutMenu(flyoutXML);
}

/*
  importFiles( files )

  Takes a string of file paths, converts it into an array of file paths, then
  for each non-duplicate path it creates a new LineItem object through a
  createLineItem() call, which is passed to the allLineItems global array.
  The path string itself is added to the openFiles array. After all files have
  been processed, updateList() is called, which populates the <select> list.
  This function is called as a csInterface callback function whenever the "+" or
  "Opened" buttons are clicked.

  @param files        A string of file paths divided by commas (created by a
                      toString() on an array in JSX functions).
*/

function importFiles(files){
  var newLineItem = {}; //variable to temporarily hold LineItem object before pushing it to allLineItems
  var openFiles = allLineItems.map(function(lineItem){
    return lineItem.path;
  });

  if(files != "undefined" && files != ""){
    files.split(',').forEach(function(element, index, array){
      //Check to confirm that file is not already imported
      if(openFiles.indexOf(element) == -1){
        newLineItem = createLineItem(array[index]); //Create LineItem object from path
        //Check if truthy value was returned from function (null can be returned due a to material size discrepancy)
        if(newLineItem) {
          allLineItems.push( newLineItem ); //If a valid object is returned, add it to array
          //openFiles.push(array[index]); //Add path to openFiles
        }
      }
    });
    updateList(allLineItems);
    updatePrintFields();
  }
}

/*
  createLineItem( path )

  Creates a new LineItem object based on a file path, populated by data pulled
  from shopBot. If there is JSON data on the server that corresponds with the
  file name, the new LineItem object is created using as much of that data as
  is relevant. If no JSON data is found on the server, it uses the locally saved
  lineitem_config file to create a LineItem object. Additionally, if the
  printSettings object has not been populated, this function will do so using
  line item data from the server. If printSettings does exist, it will also check
  for discrepancies between the existing object and the relevant JSON data for
  the  line item.
  This function is only ever called from importFiles().

  @param path       A string representing a single file path.
*/

function createLineItem( path ){
  var lineItemExt, lineItemDefault, printSettingsDefault, lineItem, override;
  var name = path.substr((path.lastIndexOf('/')+1)); //Pull the file name from the path
  //Get JSON data from server or local file, save to intermediate object

  try{
    xmlhttp.open("GET", "http://apps.indyimaging.com/ang/data/prepress/prepress_api/index/?format=json&orderDashNum=" + name, false);
    xmlhttp.send();
    lineItemExt = JSON.parse(xmlhttp.responseText);
  } catch(e) {
    //On failure, get default line item & print settings from disk
    try {
      xmlhttp.open("GET", configPath + "lineitem_config.json", false);
      xmlhttp.send();
      lineItemDefault = JSON.parse(xmlhttp.responseText);
    } catch(x) {
      alert(x);
    }
  }
  //If JSON data is valid, create new LineItem object based on JSON data
  //If printSettings is undefined, create new PrintSettings object also based on JSON data
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
    //If printSettings has not been defined, do so, initially with default values
    //Then change size values according to the line item data from the server
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
    }
    //If printSettings has been defined, check it against JSON data and alert size discrepancies
    //If user does not choose to ignore discrepancies, end function by returning null
    if(printSettings && flyoutObject.alertOnMaterialCheck) {
      if ((lineItemExt.t_AttribWidthUOM == "\'" && printSettings.materialWidth != Number(lineItemExt.n_AttribHeight))
          || (lineItemExt.t_AttribWidthUOM == "\"" && (printSettings.materialWidth != Number(lineItemExt.n_AttribWidth) || printSettings.materialHeight != Number(lineItemExt.n_AttribHeight)))){
        override = confirm("Existing material size does not match material size for " + lineItem.name + ". Continue anyway?");
        if(!override) return null;
      }
    }
  //If no JSON data is found on the server, create the LineItem object based on local JSON file
  } else {
    lineItem = new LineItem(
      path, //path
      name, //name
      lineItemDefault.quantity, //quantity
      lineItemDefault.nesting, //nesting
      "", //finished height
      "", //finished width
      lineItemDefault.cutOffset, //cut path/artboard offset
      false, //document artboard
      lineItemDefault.grommetStatus, //grommet status
      lineItemDefault.grommetSpacing, //grommet spacing
      lineItemDefault.grommetByNumber,
      lineItemDefault.pocketStatus, //pocket status
      lineItemDefault.pocketSize, //pocket size
      lineItemDefault.rotation, //rotation
      undefined
    );
    //If printSettings has not been defined, do so, with default values
    if(!printSettings) printSettings = createPrintSettings();
  }
  return lineItem;
}

/*
  createPrintSettings()

  Populates the printSettings object. First it looks for the print_config file,
  parses it and applies all its properties to the local printSettings object.
  It returns the local printSettings, which is applied to the global printSettings
  object when the function is called.
  This function is only ever called from createLineItem(). No parameters.
*/

function createPrintSettings(){
  var printSettingsDefault, printSettingsLocal;
  //Load preset print settings from local machine
  try {
    xmlhttp.open("GET", configPath + "print_config.json", false);
    xmlhttp.send();
    printSettingsDefault = JSON.parse(xmlhttp.responseText);
  } catch(x) {
    alert(x);
  }
  //Apply JSON settings to new PrintSettings object
  printSettingsLocal = new PrintSettings(
    "",
    printSettingsDefault.scale || "",
    printSettingsDefault.regMarkSpacing || "",
    printSettingsDefault.zundCut || "",
    printSettingsDefault.materialWidth || "",
    printSettingsDefault.materialHeight || "",
    printSettingsDefault.rigid || "",
    printSettingsDefault.perimPadding || [],
    printSettingsDefault.save || "",
    flyoutObject.closeSourceOnProduceCheck || "",
    printSettingsDefault.perimStroke || ""
  );
  return printSettingsLocal;
}

/*
  updateList( allLines )

  Cycles through allLines array (generally the global allLineItems), placing
  each in the Import <select> field. First it wipes out the field,
  referenced by the global variable sourceList, then loops through the array of
  objects sent to it, adding the file name to the <select> field. If any of the
  objects nesting property is true, it creates a "Nested" optgroup at the top.
  Non-nested objects are placed below the optgroup. The final object in the
  array is selected and the fields are updated accordingly.

  @param allLines       An array of LineItem objects, generally the global
                        allLineItems variable.
*/

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

/*
  updateFields( lineItem )

  Updates all the Finishing fields to match whichever line item is selected in
  the Import field. If no line item is selected, or it's not a valid LineItem
  object, the fields become blank.
  It's called whenever the <select> field changes, a new LineItem object is
  created, or on clear().

  @param lineItem       A LineItem object. Whichever one is selected in the
                        <select> field.
*/

function updateFields( lineItem ){
  if(lineItem){
    finishedDimensions.innerHTML = Math.round(lineItem.finishedHeight * 1000)/1000 + "\" H x " + Math.round(lineItem.finishedWidth * 1000)/1000 + "\" W";
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

/*
  updatePrintFields ()

  Updates all the Print fields according to the global printSettings object. If
  no printSettings object is found, fields are left blank.
  It is called whenever a new file is uploaded, or on clear(). No parameters.
*/

function updatePrintFields(){
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

/*
  updateLineItem ( lineItem )

  Passes the values from the print fields to the selected lineItem object,
  overwriting the existing values.
  Called when the Apply <button> is clicked.

  @param lineItem       The selected lineItem object.
*/

function updateLineItem( lineItem ){
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

/*
  updatePrintSettings()

  Pass the values from the Print fields to the global printSettings object.
  This is called when the Produce <button> is clicked, or when the Save Settings
  are selected. No parameters.
*/

function updatePrintSettings(){
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
    printSettings.closeSource = flyoutObject.closeSourceOnProduceCheck;
  }
}

/*
  clear()

  Clears all fields and variables. It sets the length of the <select> field to 0,
  empties out the openFiles and allLineItems variables, and sets printSettings
  back to undefined. Then it calls the three update functions to clear out the
  fields (since the objects and arrays those functions update from are now empty).
  No parameters.
*/

function clear(){
  sourceList.length = 0;
  //openFiles = [];
  allLineItems = [];
  updateList(allLineItems);
  updateFields();
  //Reset printSettings to default values in config file
  printSettings = undefined;
  createPrintSettings();
  updatePrintFields();
  csInterface.updatePanelMenuItem("Save Settings as Default", false, false);
}

/*
  grommetToggle()

  Switches the disabled status of grommet fields to the opposite of whatever it
  was before. It checks if the contrain button is checked via the gromConstStatus,
  variable and if so, does not change the B L R and HSpacing fields.
  This is called whenever the Grommets <checkbox> is clicked, or if the <checkbox>
  is changed programatically. No parameters.
*/

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

/*
  pocketToggle()

  Switches the disabled status of pocket fields to the opposite of whatever it
  was before. It checks if the contrain button is checked via the pockConstStatus,
  variable and if so, does not change the B L R fields.
  This is called whenever the Pockets <checkbox> is clicked, or if the <checkbox>
  is changed programatically. No parameters.
*/

function pocketToggle(){
  pockTopInput.disabled = !pockTopInput.disabled;
  if(!pockConstStatus){
    pockBottomInput.disabled = !pockBottomInput.disabled;
    pockLeftInput.disabled = !pockLeftInput.disabled;
    pockRightInput.disabled = !pockRightInput.disabled;
  }
  pockConstButton.disabled = !pockConstButton.disabled;
}

/*
  saveAsDefault()

  Save values from selected lineItem object and global printSettings to the
  default config file.
  Called whenever "Save Settings as Default" is selected. No parameters.
*/

function saveAsDefault(){
  var lineItemToString, printSettingsToString; //JSON strings to save to file
  //Get selected line item
  for(var x=sourceList.length-1;x>=0;x--){
    if(sourceList.options[x].selected){
      for(var z=allLineItems.length-1;z>=0;z--){
        if(sourceList.options[x].value == allLineItems[z].name){
          lineItemToString = allLineItems[z];
          break;
        }
      }
    }
  }
  lineItemToString.path = "";
  lineItemToString.name = "";
  updatePrintSettings(); //Apply values in fields to printSettings object
  lineItemToString = JSON.stringify(lineItemToString); //stringify lineÎtem object to be saved to file
  printSettingsToString = JSON.stringify(printSettings); //stringify printSettings object to be saved to file
  //Use node file system to write to files
  fs.writeFile(configPath + "lineitem_config.json", lineItemToString);
  fs.writeFile(configPath + "print_config.json", printSettingsToString);
}

/*
  saveFlyout( param, state )

  Whenever anything in the Flyout menu is selected, save the changes to a config
  file immediately.
  This function is called when the Event Listener attached to the flyout menu
  is triggered.

  @param param        The string of the menu name.
  @param state        A boolean of the current state of the menu name.
*/

function saveFlyout( param, state ){
  var flyoutObjectToString; //JSON string to save to file
  flyoutObject[param] = state;
  flyoutObjectToString = JSON.stringify(flyoutObject);
  fs.writeFileSync(configPath + "flyout_config.json", flyoutObjectToString);
}

//Returns an array of all selected <option>s in a specified <select> element
//Not really using it right now though
function getSelected(multiList){
  var selected = [];
  for(var x=0;x<multiList.length;x++){
    if(multiList.options[x].selected){
      selected.push(multiList.options[x]);
    }
  }
  return selected;
}

//----- EVENT HANDLING -----//

//Add listener to flyout menu, which returns an event object to the callback
//function on click. According to the menuId on the event object, change the
//status of the menu and call the appropriate function.
csInterface.addEventListener("com.adobe.csxs.events.flyoutMenuClicked", function(event){
  if(event.data.menuId == "saveAsDefault") saveAsDefault();
  if(event.data.menuId == "clearOnProduce"){
    flyoutObject.clearOnProduceCheck = !flyoutObject.clearOnProduceCheck;
    csInterface.updatePanelMenuItem("Clear Fields on Produce", true, flyoutObject.clearOnProduceCheck);
    saveFlyout("clearOnProduceCheck", flyoutObject.clearOnProduceCheck);
  };
  if(event.data.menuId == "closeSourceOnProduce"){
    flyoutObject.closeSourceOnProduceCheck = !flyoutObject.closeSourceOnProduceCheck;
    csInterface.updatePanelMenuItem("Close Source Files on Produce", true, flyoutObject.closeSourceOnProduceCheck);
    saveFlyout("closeSourceOnProduceCheck", flyoutObject.closeSourceOnProduceCheck);
  };
  if(event.data.menuId == "alertOnMaterial"){
    flyoutObject.alertOnMaterialCheck = !flyoutObject.alertOnMaterialCheck;
    csInterface.updatePanelMenuItem("Alert on Material Discrepancy", true, flyoutObject.alertOnMaterialCheck);
    saveFlyout("alertOnMaterialCheck", flyoutObject.alertOnMaterialCheck);
  };
});

//Add listeners to all fields within the finishingDiv. If any of the fields are
//changed (either through an "input" or a "click" event) while line items have
//been imported, the Produce <button> is disabled.
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
//Opens an import dialog box, which is called from a JSX function.
addFilesButton.onclick = function(){
  csInterface.evalScript('addFiles()', importFiles);
}

//Remove selected files from list when clicking Remove Files (-) <button>.
//Then call updateList() to clean up the <select> list.
removeFilesButton.onclick = function(){
  for(var x=sourceList.length-1;x>=0;x--){
    if(sourceList.options[x].selected){
      for(var z=allLineItems.length-1;z>=0;z--){
        if(sourceList.options[x].value == allLineItems[z].name)
          allLineItems.splice(z, 1);
          //openFiles.splice(z, 1);
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
//Uses a JSX function to get the file info from Illustrator.
allOpenFilesButton.onclick = function(){
  csInterface.evalScript('getOpenFiles()', importFiles);
}

//Add selected file(s) to Nesting <optgroup>.
//Change the nesting property to true for each.
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

//Remove selected file(s) from Nesting <optgroup>.
//Change the nesting property to true for each.
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

//If a new selection is made in the the Import <select> field, call updateFields()
//to change the values of the fields to those of the selected line item.
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

//When Apply <button> is clicked, set values in all fields to selected lineItem
//object(s).
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

//When Confirm <button> is clicked, send all lineItem object data and printSettings
//data to the processFinishing() function in the JSX file.
confirmButton.onclick = function(){
  var userInput = []; //array to hold allLineItems and printSettings
  updatePrintSettings();
  userInput.push(allLineItems);
  userInput.push(printSettings);
  jsonToJSX = JSON.stringify(userInput); //Data must be a stringify when sent to JSX file

  console.log(jsonToJSX);

  csInterface.evalScript('processFinishing(\'' + jsonToJSX + '\')');
  if(flyoutObject.clearOnProduceCheck) clear();
}

//When Clear <button> is clicked, call clear() function.
cancelButton.onclick = function(){
  clear();
}

//When the Cut Offset Constrain <button> is clicked, set the values of the B L R
//fields to match the value of the T field. Then disable the B L R fields.
//If constrain was already true, enable the B L R fields.
offsetConstButton.onclick = function(){
  if(offsetConstStatus == false){
    offsetConstStatus = true;
    offsetConstButton.className = "constrain_enabled"; //change button appearance
    offsetBottomInput.value = offsetTopInput.value;
    offsetLeftInput.value = offsetTopInput.value;
    offsetRightInput.value = offsetTopInput.value;
    offsetBottomInput.disabled = true;
    offsetLeftInput.disabled = true;
    offsetRightInput.disabled = true;
  } else {
    offsetConstStatus = false;
    offsetConstButton.className = "constrain_disabled"; //change button appearance
    offsetBottomInput.disabled = false;
    offsetLeftInput.disabled = false;
    offsetRightInput.disabled = false;
  }
}
//Whenever the T <input> field receives input, update the B L R fields, if
//constrain is active.
offsetTopInput.oninput = function(){
  if(offsetConstStatus == true){
    offsetBottomInput.value = offsetTopInput.value;
    offsetLeftInput.value = offsetTopInput.value;
    offsetRightInput.value = offsetTopInput.value;
  }
}

//When the Grommet Constrain <button> is clicked, set the values of the B L R
//fields to match the value of the T field. Then disable the B L R fields.
//If constrain was already true, enable the B L R fields.
gromConstButton.onclick = function(){
  if(gromConstStatus == false){
    gromConstStatus = true;
    gromConstButton.className = "constrain_enabled"; //change button appearance
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
    gromConstButton.className = "constrain_disabled"; //change button appearance
    gromBottomInput.disabled = false;
    gromLeftInput.disabled = false;
    gromRightInput.disabled = false;
    gromHSpacingSelect.disabled = false;
  }
}
//Whenever the Vertical Spacing <select> value changes, update the horizontal
//Spacing field to match, if constrain is active.
gromVSpacingSelect.onchange = function(){
  if(gromConstStatus == true){
    gromHSpacingSelect.value = gromVSpacingSelect.value;
  }
}
//Whenever the T <input> field receives input, update the B L R fields, if
//constrain is active.
gromTopInput.oninput = function(){
  if(gromConstStatus == true){
    gromBottomInput.value = gromTopInput.value;
    gromLeftInput.value = gromTopInput.value;
    gromRightInput.value = gromTopInput.value;
  }
}

//When the Pocket Constrain <button> is clicked, set the values of the B L R
//fields to match the value of the T field. Then disable the B L R fields.
//If constrain was already true, enable the B L R fields.
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
//Whenever the T <input> field receives input, update the B L R fields, if
//constrain is active.
pockTopInput.oninput = function(){
  if(pockConstStatus == true){
    pockBottomInput.value = pockTopInput.value;
    pockLeftInput.value = pockTopInput.value;
    pockRightInput.value = pockTopInput.value;
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

gromCheck.onclick = function(){
  grommetToggle();
}

pockCheck.onclick = function(){
  pocketToggle();
}
