/*
 * function doGet     Runs when the script app link is clicked
 * @param {Object} e  Object containing various properties. Each link will have at least one parameter labeled uid
 *                    which is stored in e.parameter
 *                    {parameter={}, contextPath=, contentLength=-1, queryString=null, parameters={[]}}
 * @return {webpage}  Returns a webpage described by assembling the various .html files
 */
function doGet(e){
  var pg = HtmlService.createTemplateFromFile('page');
  return pg.evaluate().setTitle('GWH2017: Snow Golem Loot').setFaviconUrl('https://i.imgur.com/ELxTnT2.gif');
}
