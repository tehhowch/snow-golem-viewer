// Use a cache to avoid needing to repeatedly fetch this data from HornTracker.
var scache = CacheService.getScriptCache();
var ssid = '1fN6J_d-3DAkuFys5gOY6GhE-7vHQOgtN0RDeop5exSU';
var dbSheetName = 'db';
var labels = {"Common":"1. Common", "Valuable":"2. Valuable", "Exceptional":"3. Exceptional", "Hat":"4. Hat"};


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
    for(var rarity in locationData)
      for(var item in locationData[rarity])
      {
        var loot = locationData[rarity][item];
        output.push([location, labels[rarity] || rarity, item, loot.seen, loot.quant, loot.percent * .01, loot.error * .01]);
      }
  }
  // Create (and activate) the desired sheet if it does not exist.
  if(!sheet)
  {
    sheet = ss.insertSheet(dbSheetName);
    sheet.appendRow(['Location', 'Slot', 'Item', 'Times Received', 'Quantity Received', 'Chance to Receive (%)', 'Uncertainty (%err)']);
    sheet.getDataRange().setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');
    resizeAllColumns_(sheet);
  }
  // Write the loot data to the database spreadsheet.
  if(output.length && output[0].length)
  {
    sheet.getRange(2, 1, output.length, output[0].length).setValues(output);
    resizeAllColumns_(sheet);
  }
  else
    console.info({ message: "No data to write", output: output });
}


/**
 * fetchData                   Function which handles storing & retrieving Snow Golem data from HornTracker.
 *                               If cached data exists, it is used to avoid requerying HornTracker,
 *                               otherwise a new query is performed and the results are cached by location.
 * @param String query         The desired cached item to return data for (a location or loot name).
 * @return Object              An object, containing either Golem Loot associated with the given query
 *                             (if a query was specified), or each location and its Golem Loot object.
 */
function fetchData(query)
{
  var data;

  // Attempt to retrieve cached data first.
  if(query)
    data = scache.get(query) || [];
  // Return cached data if it existed and parses.
  if(data && data.length && JSON.parse(data))
    return JSON.parse(data);

  // Obtain new data.
  var newData = getSnowGolemData_() || [];
  if(!Object.keys(newData).length)
  {
    console.error({message:'Parse error when obtaining new Golem data', newData: newData});
    return undefined;
  }

  // Cache this object for 15 minutes.
  try
  {
    storeData_(newData, 60 * 15);
    storeLootData_(newData, 60 * 15);
  }
  catch(e)
  {
    console.error({message:'Unable to cache Snow Golem data', "golem data": newData, "error":e})
  }


  // Return the desired bits.
  if(query)
    return fetchData(query);
  else if(newData['snowman'])
    return newData['snowman'];
  else
  {
    console.error({message:'Unknown object received', newData: newData});
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

  // Build a cache object of all keys, and the results of each key.
  var cache = {"locations": JSON.stringify(locations)};
  for(var i = 0; i < locations.length; ++i)
    cache[locations[i]]=JSON.stringify(data['snowman'][locations[i]]);

  scache.putAll(cache, duration);
}



/**
 * storeLootData_              Function to dissect the snowman loot into usable bits, then cache them.
 *
 * @param Object data          A JSON object of the type returned by getSnowGolemData_() (i.e. has a 'snowman' property).
 * @param Integer duration     A number indicating the number of seconds this data should be cached (default 10 minutes).
 */
function storeLootData_(data, duration)
{
  if(!data || !data['snowman'])
    return;
  if(!duration || duration > 21600)
    duration = 600;

  // Process the input data to glean loot, and the locations in which that loot is found.
  console.time('Process Loot');
  var loot = {};
  var lootNames = [];
  for(var location in data['snowman'])
    for(var rarity in data['snowman'][location])
      for(var item in data['snowman'][location][rarity])
      {
        var itemData = data['snowman'][location][rarity][item];

        // Insert new items into the lootNames array.
        if(lootNames.indexOf(item) < 0)
          lootNames.push(item);

        // Create a loot object if not already present.
        if(Object.keys(loot).indexOf(item) < 0)
          loot[item] = {'rarity':{}, 'locations':{}};
        // Create this rarity in the loot object, if not already present.
        if(Object.keys(loot[item].rarity).indexOf(rarity) < 0)
          loot[item].rarity[rarity] = {};
        // Create this location in the loot object, if not already present.
        if(Object.keys(loot[item].locations).indexOf(location) < 0)
          loot[item].locations[location] = {};

        // Add this loot's item data to its loot object.
        loot[item].locations[location][rarity] = itemData;
        loot[item].rarity[rarity][location] = itemData;
      }

  // Create a cacheable object from the collected data.
  var cache = {'lootNames': JSON.stringify(lootNames)};
  // Store the locations in which each loot is found.
  for(var item in loot)
    cache[item] = JSON.stringify(loot[item]);

  console.timeEnd('Process Loot');
  scache.putAll(cache, duration);
}



function resizeAllColumns_(sheet)
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
  return readAPI_(JSON.stringify({'f':f}));
}
