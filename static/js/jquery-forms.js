if (window.console === undefined) {
  window.console = {"log": function() { } };// just swallow any logs, if there aren't any dev tools available.
}

function parseLooseForm($form) {
  var store = {};
  $form.children('div').each(function(i, div) {
    var field = div.id,
        $div = $(div),
        value = [],
        force_list = false;
    $div.find("input[type='text']").each(function(i, el) {
      value.push(el.value);
    });
    $div.find("input[type='password']").each(function(i, el) {
      value.push(el.value);
    });
    // for each checkbox get the id, find the label[for=<that-id>].innerText, use that as value
    $div.find("input[type='checkbox']").each(function(i, el) {
      force_list = true;
      var $el = $(el);
      if ($el.prop('checked')) {
        var text = $div.find("label[for='" + el.id + "']").text();
        value.push(text);
      }
    });
    
    var $radio = $div.find("input[type='radio']:checked");
    if ($radio.length > 0) {
      var text = $div.find("label[for='" + $radio.attr('id') + "']").text();
      value.push(text);
    }

    // var text_value = $div.find("input[type='text']").map(function(i, el) { return el.value; });
    // if (text_value !== undefined && text_value !== null) {
    //   value.push(text_value);
    // }
    if (!force_list && value.length < 2) {
      value = value[0];
    }
    store[div.id] = value;
  });
  return store;
}