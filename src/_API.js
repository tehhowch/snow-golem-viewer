/**
 * Query the Horntracker API with the given JSON argument
 *
 * @param Object      A JSON object suitable to serve as a UrlFetchApp POST payload
 * @return Object     A JSON object, or null
 */
function readAPI_()
{
  var url = 'http://horntracker.com/backend/new/api.php';
  if (arguments.length == 0) return null;
  var o;
  try
  {
    o = JSON.parse(UrlFetchApp.fetch(url, { 'method': "POST", 'payload': arguments[0] }));
  }
  catch (e)
  {
    // Perform the query twice, after waiting a bit (e.g. allow for Horntracker load issues).
    console.warn({ message: 'First query failed. Attempting again after 5s', error: e });
    Utilities.sleep(5000);
    try
    {
      o = JSON.parse(UrlFetchApp.fetch(url, { 'method': "POST", 'payload': arguments[0] }));
    }
    catch (e)
    {
      console.error({ message: "Both queries failed.", error: e });
      return null;
    }
  }
  return o;
}
