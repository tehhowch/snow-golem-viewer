/**
 * function doGet     Runs when the script app link is clicked
 * @param {Object} e  Object containing various properties. Each link will have at least one parameter labeled uid
 *                    which is stored in e.parameter
 *                    {parameter={}, contextPath=, contentLength=-1, queryString=null, parameters={[]}}
 * @return {webpage}  Returns a webpage described by assembling the various .html files
 */
function doGet(e)
{
  var pg = HtmlService.createTemplateFromFile('lootPage');
  console.log({ message: 'webapp hit', input: e });
  return pg.evaluate().setTitle('GWH2017 Snow Golem Loot').setFaviconUrl('https://i.imgur.com/ELxTnT2.gif');
}

/**
 * function getLocationsList      Returns an array of the available locations.
 * @param Boolean tryAgain        Flag indicating if the cache missed and this is the 2nd call.
 * @return String[]
 */
function getLocationsList(tryAgain)
{
  if (tryAgain == undefined)
    tryAgain = true;

  // Fetch the cached data.
  var locations = scache.get("locations") || [];
  // Trigger an update if there is no valid cached data.
  if (!locations.length && tryAgain)
  {
    fetchData();
    Utilities.sleep(5000);
    return getLocationsList(false);
  }
  else if (locations.length)
    return { id: 'locationList', data: JSON.parse(locations) };
  else
    throw new Error('Unable to read list of locations.');
}



/**
 * function getLootList         Returns an array of the available loot.
 * @param Boolean tryAgain      Flag indicating if the cache missed and this is the 2nd call.
 * @return String[]
 */
function getLootList(tryAgain)
{
  if (tryAgain == undefined)
    tryAgain = true;

  // Fetch the cached data.
  var loot = scache.get("lootNames") || [];
  // Trigger an update if there is no valid cached data.
  if (!loot.length && tryAgain)
  {
    fetchData();
    Utilities.sleep(5000);
    return getLootList(false);
  }
  else if (loot.length)
    return { id: 'lootList', data: JSON.parse(loot) };
  else
    throw new Error('Unable to read list of loot.');
}

/**
 * itemTracker
 */
function itemTracker(selection)
{
  try
  {
    SpreadsheetApp.openById(ssid).getSheetByName('tracker').appendRow([
      new Date(),
      selection.type,
      selection.value
    ]);
  }
  catch (e) { }
}
