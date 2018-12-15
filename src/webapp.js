/**
 * Display the web application to the requesting client.
 *
 * @param {Object.<string, any>} e Object containing various properties, namely:
 *                    {parameter={}, contextPath=, contentLength=-1, queryString=null, parameters={[]}}
 * @returns {GoogleAppsScript.HTML.HtmlOutput} Returns a webpage described by assembling the various .html files
 */
function doGet(e)
{
  var pg = HtmlService.createTemplateFromFile('lootPage');
  console.log({ message: 'webapp hit', input: e });
  return pg.evaluate().setTitle('GWH2017 Snow Golem Loot').setFaviconUrl('https://i.imgur.com/ELxTnT2.gif');
}


/**
 * Read the available locations from cache. Will attempt to recache on miss.
 * @returns {CacheList} The known Snow Golem locations (which are also cache keys).
 */
function getLocationsList()
{
  const locations = getCachedList_('locationList', 'locations', true);
  if (!locations)
    throw new Error('Unable to read list of locations.');
}

/**
 * Read the available locations from cache. Will attempt to recache on miss.
 * @returns {CacheList} The known Snow Golem loots (which are also cache keys).
 */
function getLootList()
{
  const loot = getCachedList_('lootList', 'lootNames', true);
  if (!loot)
    throw new Error('Unable to read list of loot.');
}

/**
 * Read the available key from cache. Will attempt to recache all keys on miss.
 *
 * @param {string} elemId The HTMLElement ID associated with the request, e.g. 'lootList' or 'locationList'
 * @param {string} key The key for which data should be found in cache.
 * @param {boolean} tryAgain True if we allow Apps Script to requery and recache the data.
 * @returns {CacheList} The cached data for the given key.
 */
function getCachedList_(elemId, key, tryAgain)
{
  if (tryAgain !== false)
    tryAgain = true;

  const data = scache.get(key);
  if (!data && tryAgain)
  {
    fetchData();
    Utilities.sleep(5000);
    return getCachedList_(elemId, key, false);
  }
  else if (data)
    return { 'id': elemId, 'data': JSON.parse(data) };
  else
    return null;
}
/** @typedef {Object} CacheList
 * @property {string} id The kind of data in cache.
 * @property {Array} data An array of the cached data (as parsed from JSON)
 */

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
