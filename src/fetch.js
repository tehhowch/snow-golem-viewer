// Use a cache to avoid needing to repeatedly fetch this data from HornTracker.
var scache = CacheService.getScriptCache();
var ssid = '1fN6J_d-3DAkuFys5gOY6GhE-7vHQOgtN0RDeop5exSU';
var dbSheetName = 'db';
var knownLocations;


// Store data to the worksheet.
function writeData()
{
  var ss = SpreadsheetApp.openById(ssid);
  var sheet = ss.getSheetByName(dbSheetName);
  var data = fetchData();
  var output = [];
  for(var location in data)
  {
    var locationData = data[location];
    var i = 0;
    for(var rarity in locationData)
    {
      ++i;
      for(var item in locationData[rarity])
      {
        var loot = locationData[rarity][item];
        output.push([location, i + ". " + rarity, item, loot.seen, loot.quant, loot.percent * .01, loot.error * .01]);
      }
    }
  }
  // Create (and activate) the desired sheet if it does not exist.
  if(!sheet)
  {
    sheet = ss.insertSheet(dbSheetName);
    sheet.appendRow(['Location', 'Slot', 'Item', 'Times Received', 'Quantity Received', 'Chance to Receive (%)', 'Uncertainty (%err)']);
    sheet.getDataRange().setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');
    resizeAllColumns(sheet);
  }
  // Write the loot data to the database spreadsheet.
  if(output.length && output[0].length)
  {
    sheet.getRange(2, 1, output.length, output[0].length).setValues(output);
    resizeAllColumns(sheet);
  }
  else
    console.info("No data to write", output);
}


/**
 * fetchData                   Function which handles storing & retrieving Snow Golem data from HornTracker.
 *                               If cached data exists, it is used to avoid requerying HornTracker,
 *                               otherwise a new query is performed and the results are cached by location.
 * @param String location      The desired hunting location to which a Snow Golem can be dispatched.
 * @return Object              An object, containing either Golem Loot associated with the given location
 *                             (if a location was specified), or each location and its Golem Loot object.
 */
function fetchData(location)
{
  var data;

  // Attempt to retrieve cached data first.
  if(location)
    data = scache.get(location);
  // Return cached data if it existed and parses.
  if(data && JSON.parse(data))
    return JSON.parse(data);

  // Need to obtain new data, cache it, and return the desired location (or everything).
  var newData = getSnowGolemData_() || [];
  if(!newData)
  {
    console.error('Parse error when obtaining new Golem data', newData);
    return undefined;
  }
  // Cache this object for an hour.
  try
  {
    storeData_(newData, 3600);
  }
  catch(e)
  {
    console.error('Unable to cache Snow Golem data', { "golem data": newData, "error": e });
  }
  // Return the desired bits.
  if(location)
    return fetchData(location);
  else if(newData['snowman'])
    return newData['snowman'];
  else
  {
    console.error('Unknown object received', newData);
    return undefined;
  }
}



/**
 * storeData_                      Function to cache the given Snow Golem data by location, for the given duration
 *
 * @param Object data              A JSON object of the type returned by getSnowGolemData_() (i.e. has a 'snowman' property).
 * @param Integer duration         A number indicating the number of seconds this data should be cached (default 10 minutes).
 */
function storeData_(data, duration)
{
  if(!data)
    return;
  if(!duration || duration > 21600)
    duration = 600;

  // Store data for each location separately.
  var locations = Object.keys(data['snowman']) || [];
  if(!locations.length)
    return;

  var cache = {};
  for(var i = 0; i < locations.length; ++i)
    cache[locations[i]]=JSON.stringify(data['snowman'][locations[i]]);

  scache.putAll(cache, duration);
}




function resizeAllColumns(sheet)
{
  for(var col = 1; col <= sheet.getLastColumn(); ++col)
    sheet.autoResizeColumn(col);
}

/**
 * Return data for the 2017 Great Winter Hunt's "Snow Golem" loot object.
 *
 * @return Object    A JSON object with the contents of all logged Snow Golems.
 *                   {"snowman": { "Location 1" : { "Item Quality 1" : { "Item 1" :
 *                        { int seen, int quant, string percent, string error }}}}}
 */
function getSnowGolemData_()
{
  var f = "getSnowmanData";
  return readAPI_(JSON.stringify({'f': f}));
}
