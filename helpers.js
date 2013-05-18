'use strict'; /*jslint nomen: true, node: true, indent: 2, debug: true, vars: true, es5: true */
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
