if (window.console === undefined) {
  window.console = {"log": function() { } };// just swallow any logs, if there aren't any dev tools available.
}

function parseLooseForm($form) {
  var store = {};
  $form.children('div').each(function(i, div) {
    var $div = $(div),
        value = [],
        force_list = false;
    
    $div.find("input[type='text']").each(function(i, el) {
      value.push(el.value);
    });
    $div.find("input[type='password']").each(function(i, el) {
      value.push(el.value);
    });
    if ($div.find("input[type='checkbox']").length > 1) {
      force_list = true;
    }

    // for each checkbox/radiobutton get the id, find the label[for=<that-id>].innerText, use that as value
    $div.find("input[type='checkbox']:checked").each(function(i, el) {
      value.push($div.find("label[for='" + el.id + "']").text());
    });
    $div.find("input[type='radio']:checked").each(function(i, el) {
      value.push($div.find("label[for='" + el.id + "']").text());
    });

    if (!force_list && value.length < 2) {
      value = value[0];
    }
    store[div.id] = value;
  });
  return store;
}