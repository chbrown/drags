// a FSM takes a string and spits out a string.
function FSM(transitions) {
  this.transitions = transitions;
}
FSM.prototype.feed = function(input) {
  for (var i = 0, l = this.transitions.length; i < l; i++) {
    var trigger = this.transitions[i][0],
      action = this.transitions[i][1];
    if (trigger instanceof RegExp) {
      var m = input.match(start);
      if (m) {
        // regular expressions with a function-trigger get the match
        return this.advance(action, m);
      }
    }
    else if (trigger === input) {
      // but normal strings with a function-trigger get the input string
      return this.advance(action, input);
    }
  }
};
FSM.prototype.advance = function(action, input) {
  if (typeof action === 'function') {
    return action.call(this, input);
  }
  else {
    // hope it's a string!
    return action;
  }
};
