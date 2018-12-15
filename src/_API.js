/**
 * Query the Horntracker API with the given JSON argument
 *
 * @param {Object.<string, string>} payload A JSON object suitable to serve as a UrlFetchApp POST payload
 * @returns {Object.<string, any>|null} If there was no issue with the query (or HornTracker), returns the parsed JSON data. Otherwise, returns `null`
 */
function readAPI_(payload)
{
  const url = 'http://horntracker.com/backend/new/api.php';
  if (!payload)
    return null;

  // Formulate the request.
  const rq = UrlFetchApp.getRequest(url, { 'method': 'POST', 'payload': payload });
  try { var resp = UrlFetchApp.fetchAll([rq])[0]; }
  catch (fetchError)
  {
    console.warn({ 'message': 'HornTracker query failed with error ' + fetchError, 'request': rq, 'response': resp });
    return null;
  }

  // If the server indicated an issue, don't try to parse the (likely invalid) data.
  if (!resp || resp.getResponseCode() !== 200 || resp.getContentText().toLowerCase().indexOf('connect to'))
  {
    console.warn({ 'message': 'HornTracker server replied with bad data', 'request': rq, 'response': resp });
    return null;
  }

  // Parse the response.
  try { return JSON.parse(resp.getContentText()); }
  catch (parseError)
  {
    console.warn({ 'message': 'Received data was not JSON', 'request': rq, 'response': resp });
    return null;
  }
}
