/**
 * Query the Horntracker API with the given JSON argument
 *
 * @param {string} payload A stringified JSON object suitable to serve as a UrlFetchApp POST payload
 * @returns {Object.<string, any>|null} If there was no issue with the query (or HornTracker), returns the parsed JSON data. Otherwise, returns `null`
 */
function readAPI_(payload)
{
  const url = 'http://horntracker.com/backend/new/api.php';
  if (!payload)
    return null;

  // Formulate the request.
  const rq = UrlFetchApp.getRequest(url, { 'method': 'post', 'payload': payload });
  try { var resp = UrlFetchApp.fetchAll([rq])[0]; }
  catch (fetchError)
  {
    console.warn({ 'message': 'HornTracker query failed with error ' + fetchError, 'request': rq, 'response': resp });
    return null;
  }

  if (!resp)
    return null;

  const content = resp.getContentText();
  const htErrors = ['connect to mysql', 'unexpected error'];
  if (htErrors.some(function (fragment) { return content.indexOf(fragment) !== -1; }))
  {
    console.warn({ 'message': 'HornTracker server replied with bad data', 'request': rq, 'response': resp });
    return null;
  }

  // Parse the response.
  try { return JSON.parse(resp.getContentText()); }
  catch (parseError)
  {
    console.warn({ 'message': 'Received data was not JSON', 'request': rq, 'response': resp, 'status': resp.getResponseCode() });
    return null;
  }
}
