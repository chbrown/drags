/*jslint browser: true */ /*globals jQuery, window, console */
(function(exports) {
  function offset(el) {
    // maybe hack in jQuery global since $.fn.offset is kind of handy?
    var el_offset = {left: el.offsetLeft, top: el.offsetTop}; // $(el).offset()
    return el_offset;
  }

  function rotateTo(el, a, b) {
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

    // radians are measured from the bottom, positive going clockwise.
    //   we add 180, so that we are starting from the top
    var degrees = (radians * 180.0 / Math.PI) + 180;
    return { radians: radians, degrees: degrees, length: length };
  }

  function createLine() {
    var el = document.createElement('div');
    el.style.backgroundColor = 'black';
    el.style.position = 'absolute';
    el.style.width = '1.5pt'; // pixel widths disappear when zoomed out
    el.style.position = 'absolute';
    el.style.transformOrigin = '0% 0%';
    el.style['-webkit-transform-origin'] = '0% 0%';
    return el;
  }

  var Protractor = exports.Protractor = function(container, options) {
    if (options === undefined) options = {};
    if (options.center === undefined) {
      options.center = {
        x: container.clientWidth / 2.0,
        y: container.clientHeight / 2.0
      };
    }
    if (options.onclick === undefined) {
      options.onclick = function() {};
    }
    this.opts = options;

    this.line = createLine();
    this.vector = {angle: 0, length: -1};

    container.appendChild(this.line);
    container.addEventListener('click', this.onclick.bind(this));
    container.addEventListener('mousemove', this.onmousemove.bind(this));

    this.container = container;
  };
  Protractor.prototype.onclick = function(ev) {
    this.opts.onclick(this.vector);
  };
  Protractor.prototype.onmousemove = function(ev) {
    var origin = offset(this.container);
    var cursor = {
      x: ev.pageX - origin.left,
      y: ev.pageY - origin.top
    };
    this.vector = rotateTo(this.line, this.opts.center, cursor);
  };
})(window);

// also add as jQuery plugin

(function($) {
  $.fn.protractor = function(options) {
    // this should only be called on elements that are block-like and have "position: relative"
    return $(this).each(function() {
      var protractor = new window.Protractor(this, options);
      $(this).data('protractor', protractor);
    });
  };
})(jQuery);
