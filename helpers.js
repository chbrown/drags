'use strict'; /*jslint node: true, es5: true, indent: 2 */
exports.parseJSON = function(json, default_result) {
  var result;
  try {
    result = JSON.parse(json);
  }
  catch (exc) {
    // console.error(exc);
    result = default_result;
  }
  return result;
};
