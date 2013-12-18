// "use strict"; /*jslint indent: 2 */ /*globals $ */

function lineTo(el, a, b) {
  var dx = b.x - a.x;
  var dy = b.y - a.y;
  // The atan method returns a numeric value between -pi/2 and pi/2 radians.
  // The atan2 method returns a numeric value between -pi and pi representing the angle theta of an (x,y) point.
  var radians = -Math.atan2(dx, dy);
  var length = Math.sqrt((dx * dx) + (dy * dy));

  el.style.height = length + 'px';
  el.style.left = a.x + 'px';
  el.style.top = a.y + 'px';

  ['', '-ms-', '-o-', '-moz-', '-webkit-'].forEach(function(prefix) {
    el.style[prefix + 'transform'] = 'rotate(' + radians + 'rad)';
  });

  return { radians: radians, length: length };
}

$.fn.protractor = function(opts) {
  // this should only be called on elements that are block-like and have "position: relative"
  return $(this).each(function() {
    var center = {x: $(this).width() / 2.0, y: $(this).height() / 2.0};

    var styles = 'background-color: black; position: absolute; width: 1px;';
    styles += 'transform-origin: 0% 0%; -webkit-transform-origin: 0% 0%;';
    var $line = $('<div style="' + styles + '"></div>').appendTo(this);
    var $angle_input = $('<input name="angle" type="hidden" value="" />').appendTo(this);
    var $length_input = $('<input name="length" type="hidden" value="" />').appendTo(this);
    var line = $line[0];

    this.addEventListener('mousemove', function(ev) {
      var origin = $(this).offset();
      var vector = lineTo(line, center, {x: ev.pageX - origin.left, y: ev.pageY - origin.top});
      var degrees = vector.radians * 180.0 / Math.PI;
      // vector.radians are measured from the bottom, positive going clockwise
      // we add 180, so that we are starting from the top
      $angle_input.val((degrees + 180) % 360);
      $length_input.val(vector.length);
    });
  });
};
