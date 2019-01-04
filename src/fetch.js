// Use a cache to avoid needing to repeatedly fetch this data from HornTracker.
var scache = CacheService.getScriptCache();
var ssid = '1fN6J_d-3DAkuFys5gOY6GhE-7vHQOgtN0RDeop5exSU';
var dbSheetName = 'db';
var labels = { "Common": "1. Common", "Valuable": "2. Valuable", "Exceptional": "3. Exceptional", "Hat": "4. Hat" };

/**
 * Get a reference to the database sheet on which information is logged.
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} wb The container in which the database sheet should live
 * @param {string} name The expected name of the database sheet.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} The database sheet, which may have been just created and initialized.
 */
function _getDbSheet_(wb, name)
{
  var sheet = wb.getSheetByName(name);
  if (!sheet)
  {
    console.log('Creating the database sheet named \'' + name + '\'');
    sheet = wb.insertSheet(name);
    _initDbSheet_(sheet);
  }
  return sheet;
}
/**
 * Initialize the given sheet as a database sheet.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 */
function _initDbSheet_(sheet)
{
  // Remove any pre-existing formatting or data.
  sheet.clear();
  SpreadsheetApp.flush();

  // Create the header row, and make it somewhat visually appealing.
  const headers = [
    ['Location', 'Slot', 'Item', 'Times Received', 'Quantity Received', 'Chance to Receive (%)', 'Uncertainty (%err)']
  ];
  sheet.getRange(1, 1, headers.length, headers[0].length)
    .setValues(headers)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.autoResizeColumns(1, sheet.getLastColumn());
}


/**
 * Store all known data in the database worksheet.
 */
function writeData()
{
  const ss = SpreadsheetApp.openById(ssid);
  const sheet = _getDbSheet_(ss, dbSheetName);
  const data = fetchData();
  const output = [];
  for (var location in data)
  {
    var locationData = data[location];
    for (var rarity in locationData)
      for (var item in locationData[rarity])
      {
        var loot = locationData[rarity][item];
        output.push([location, labels[rarity] || rarity, item, loot.seen, loot.quant, loot.percent * .01, loot.error * .01]);
      }
  }
  // Write the loot data to the database spreadsheet.
  if (output.length && output[0].length)
  {
    sheet.getRange(2, 1, output.length, output[0].length).setValues(output);
    sheet.autoResizeColumns(1, sheet.getLastColumn());
  }
  else
    console.info({ message: "No data to write", output: output });
}


/**
 * Obtain Snow Golem data from either cache or the HornTracker backend function.
 *
 * @param {string} [query]  The desired cache key to return data for (a location or loot name).
 * @returns {Object.<string, any>} An object, containing either Golem Loot associated with the given query
 *                             (if a query was specified), or each location and its Golem Loot object.
 */
function fetchData(query)
{
  // Attempt to retrieve cached data first.
  const data = query ? scache.get(query) : undefined;
  // Return cached data if it existed and parses.
  if (data)
  {
    try { return JSON.parse(data); }
    catch (parseError)
    {
      console.log({ 'message': 'Expected JSON-formatted cached data', 'cached data': data, 'key': query });
    }
  }

  // Obtain new data.
  const newData = getSnowGolemDataFromHT_() || getSnowGolemDataFromSpreadsheet_();
  if (!newData)
  {
    console.warn('Unable to obtain Snow Golem data');
    return undefined;
  }

  // Cache the data object for 15 minutes.
  try
  {
    storeData_(newData, 60 * 15);
    storeLootData_(newData, 60 * 15);
  }
  catch (cacheError)
  {
    console.error({ 'message': 'Unable to cache Snow Golem data', "golem data": newData, "error": cacheError })
  }


  // Return only the desired bits (e.g. specific location / loot data).
  if (query)
    return fetchData(query);
  else if (newData['snowman'])
    return newData['snowman'];
  else
  {
    console.error({ 'message': 'Unknown object received', 'new data': newData });
    return undefined;
  }
}



/**
 * Cache the given Snow Golem data by location, for the given duration
 *
 * @param {Object.<string, any>} data A JSON object of the type returned by getSnowGolemData_() (i.e. has a 'snowman' property).
 * @param {number} duration A number indicating the number of seconds this data should be cached (default 10 minutes).
 */
function storeData_(data, duration)
{
  if (!data || !data['snowman'])
    return;
  if (!duration || duration > 21600)
    duration = 600;

  // Store data for each location separately.
  const locations = Object.keys(data['snowman']);
  if (!locations.length)
    return;

  // Build a cache object of all keys, and the results of each key.
  /** @type {Object.<string, string>} */
  const cache = locations.reduce(function (cd, location, i) {
    cd[location] = JSON.stringify(data['snowman'][location]);
    return cd;
  }, { 'locations': JSON.stringify(locations) });

  scache.putAll(cache, duration);
}



/**
 * Extract usable bits for each loot item found by the Snow Golems and cache them.
 *
 * @param {Object.<string, any>} data A JSON object of the type returned by getSnowGolemData_() (i.e. has a 'snowman' property).
 * @param {number} duration A number indicating the number of seconds this data should be cached (default 10 minutes).
 */
function storeLootData_(data, duration)
{
  if (!data || !data['snowman'])
    return;
  if (!duration || duration > 21600)
    duration = 600;

  // Process the input data to glean loot, and the locations in which that loot is found.
  console.time('Process Loot');
  const loot = {};
  /** @type {Object.<string, boolean>} */
  const lootNames = {};
  for (var location in data['snowman'])
    for (var rarity in data['snowman'][location])
      for (var item in data['snowman'][location][rarity])
      {
        var itemData = data['snowman'][location][rarity][item];

        // Add this item to those that will be written.
        lootNames[item] = true;

        // Create a loot object if not already present.
        if (!loot.hasOwnProperty(item))
          loot[item] = { 'rarity': {}, 'locations': {} };
        // Create the default property for rarity and locations if not already present.
        [{'k': 'rarity', 'v': rarity},
         {'k': 'locations', 'v': location }].forEach(function (kv) {
           if (!loot[item][kv['k']].hasOwnProperty(kv['v']))
            loot[item][kv['k']][kv['v']] = {};
         });

        // Add this loot's item data to its loot object.
        loot[item].locations[location][rarity] = itemData;
        loot[item].rarity[rarity][location] = itemData;
      }

  // Create a cacheable object from the collected data.
  const cache = { 'lootNames': JSON.stringify(Object.keys(lootNames)) };
  // Store the locations in which each loot is found.
  for (var item in loot)
    cache[item] = JSON.stringify(loot[item]);

  console.timeEnd('Process Loot');
  scache.putAll(cache, duration);
}

/** @typedef {Object} ItemData
 * @property {number} seen The number of times this item was observed in golem loot.
 * @property {number} quant The number of this item obtained when it is received.
 * @property {string} percent The chance of receiving this item in this manner.
 * @property {string} error The standard error associated with the percent value.
*/

/**
 * Return data for the 2017 Great Winter Hunt's "Snow Golem" loot object.
 *
 * @return {Object.<string, any>} A JSON object with the contents of all logged Snow Golems.
 *                   {"snowman": { "Location 1" : { "Item Quality 1" : { "Item 1" : ItemData }}}}
 */
function getSnowGolemDataFromHT_()
{
  const f = "getSnowmanData";
  return readAPI_(JSON.stringify({ 'f': f }));
}


function getSnowGolemDataFromSpreadsheet_()
{
  const labelReverser = Object.keys(labels).reduce(function (acc, label) {
    acc[labels[label]] = label;
    return acc;
  }, {});
  const sheet = _getDbSheet_(SpreadsheetApp.openById(ssid), dbSheetName);
  /** @type {Array[]} */
  const savedData = sheet.getSheetValues(2, 1, sheet.getLastRow(), sheet.getLastColumn());

  // Reconstruct the object from the serialized array.
  const output = {};
  savedData.filter(function (row) { return row[0]; }).forEach(function (row) {
    var location = row[0];
    if (!output.hasOwnProperty(location))
      output[location] = {};
    var rarity = labelReverser[row[1]];
    if (!output[location].hasOwnProperty(rarity))
      output[location][rarity] = {};
    var item = row[2];
    // There should only be a single instance of an item for a given location and rarity.
    output[location][rarity][item] = {
      'seen': row[3].toString(),
      'quant': row[4].toString(),
      'percent': (row[5] * 100).toString().substring(0, 5),
      'error': (row[6] * 100).toString().substring(0, 5)
    };
  });
  return { 'snowman': output };
}
