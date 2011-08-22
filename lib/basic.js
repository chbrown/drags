/* To Title Case 1.1.1
 * David Gouch <http://individed.com>
 * 23 May 2008
 * License: http://individed.com/code/to-title-case/license.txt
 *
 * In response to John Gruber's call for a Javascript version of his script: 
 * http://daringfireball.net/2008/05/title_case
 */
String.prototype.toTitleCase = function() {
  return this.replace(/([\w&`'‘’"“.@:\/\{\(\[<>_]+-? *)/g, function(match, p1, index, title) {
    if (index > 0 && title.charAt(index - 2) !== ":" &&
      match.search(/^(a(nd?|s|t)?|b(ut|y)|en|for|i[fn]|o[fnr]|t(he|o)|vs?\.?|via)[ \-]/i) > -1)
        return match.toLowerCase();
    if (title.substring(index - 1, index + 1).search(/['"_{(\[]/) > -1)
        return match.charAt(0) + match.charAt(1).toUpperCase() + match.substr(2);
    if (match.substr(1).search(/[A-Z]+|&|[\w]+[._][\w]+/) > -1 || 
      title.substring(index - 1, index + 1).search(/[\])}]/) > -1)
        return match;
    return match.charAt(0).toUpperCase() + match.substr(1);
  });
};
String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}
String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g, '');
}
Array.prototype.shuffle = function() {
  // this is not destructive! but it only returns a SHALLOW copy
  // http://sedition.com/perl/javascript-fy.html
  var copy = this.slice(0)
  var i = copy.length
  if (i == 0)
    return []
  while (--i) {
    var j = Math.floor(Math.random() * (i + 1))
    var tempi = copy[i]
    var tempj = copy[j] // necessary to split?
    copy[i] = tempj
    copy[j] = tempi
  }
  return copy
}
// non-destructive, but shallow copies only!
Array.prototype.sample = function(count, replacement) {
  // replacement: true if you're okay with duplicates, false if you want uniques (based on array) 
  var total = this.length
  if (count > total)
    replacement = true
  var samples = []
  var remaining_slots = count
  if (replacement === undefined || replacement) {
    for (; remaining_slots > 0; remaining_slots--) {
      samples.push(this[Math.floor(Math.random() * total)])
    }
  }
  else {
    // replacement = false, so we have to pick uniques, randomly.
    // var samples_count = 0
    // this is a finite loop, so it can return less than count, in bad situations
    for (var i = 0; i < 100000 && remaining_slots > 0; i++) {
      if (total < 200) {
        var shuffled = this.shuffle()
        if (shuffled.length > remaining_slots) {
          samples = samples.concat(shuffled.slice(shuffled.length - remaining_slots))
          remaining_slots = 0
        }
        else {
          samples = samples.concat(shuffled)
          remaining_slots -= shuffled.length
        }
      }
      else {
        // this will likely bog down when it gets to the last few elements if count == total > 200
        var candidate = this[Math.floor(Math.random() * total)]
        if (samples.indexOf(candidate) === -1) {
          samples.push(candidate)
          remaining_slots--
        }
      }
    }
  }
  return samples
};

JSON.parseWithDefault = function(str, default_obj) {
  try { return JSON.parse(str) }
  catch (e) { return default_obj }
};
// calling it "toJSON" will make it go crazy! (because JSON.stringify calls that name)
Object.prototype.toJsonString = function() {
  return JSON.stringify(this);
}
