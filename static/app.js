/*jslint browser: true, devel: true */ /*globals _, angular, p */
var app = angular.module('app', [
  'ngStorage',
  'misc-js/angular-plugins',
], function($interpolateProvider) {
  $interpolateProvider.startSymbol('<%');
  $interpolateProvider.endSymbol('%>');
});

app.directive('map', function() {
  return {
    restrict: 'E',
    templateUrl: '/templates/map-table.html',
    replace: true,
    scope: {
      items: '=ngModel'
    }
  };
});

app.controller('ResponsesCtrl', function($scope, $localStorage, $http, $flash, $q) {
  $scope.$storage = $localStorage.$default({
    filter: {
      // experiment_id - restrict to responses connected to this experiment only.
      experiment_id: null,
      stimulus_id: null,
    }
  });

  var fmtHttpError = function(res) {
    return $q.reject(res.status + ': ' + res.statusText + ': ' + String(res.data));
  };

  // initialize with distinct user/stimulus/experiment ids
  var promise = $http({url: '/admin/responses/distinct-ids'}).then(function(res) {
    $scope.distinct = res.data;
    return 'Loaded all options';
  }, fmtHttpError);

  $scope.$watch('$storage.filter.stimulus_id', function() {
    var stimulus_id = $scope.$storage.filter.stimulus_id;
    if (stimulus_id) {
      var promise = $http({
        url: '/admin/responses/values',
        params: {stimulus_id: stimulus_id},
      }).then(function(res) {
        $scope.stimulus_values = res.data.values;
        return 'Loaded values for stimulus';
      }, fmtHttpError);
      // $flash(promise);
    }
  });

  $scope.refresh = function() {
    var promise = $http({
      url: '/admin/responses.json',
      params: {
        experiment_id: $scope.$storage.filter.experiment_id,
        stimulus_id: $scope.$storage.filter.stimulus_id,
        value: $scope.$storage.filter.value,
      },
    }).then(function(res) {
      $scope.total = res.data.total;
      $scope.responses = res.data.rows;
      return 'Retrieved ' + $scope.responses.length + ' / ' + $scope.total + ' responses';
    }, fmtHttpError);
    $flash(promise);
  };

  // true enables deep checking
  $scope.$watch('$storage.filter', $scope.refresh, true);

  $scope.clickDebounce = function(ev) {
    // kind of a hack...
    var el = angular.element(ev.target);
    var original_html = el.html();

    el.prop('disabled', true);
    el.html('Please wait');
    setTimeout(function() {
      el.prop('disabled', false);
      el.html(original_html);
    }, 5000);
  };

});

// document.querySelector('a[href="' + window.location.pathname + '"]').classList.add('current');
app.directive('nav', function($window, $rootScope) {
  // the most specific link inside each nav that matches
  return {
    restrict: 'E',
    link: function(scope, element, attrs) {
      var updateCurrent = function(anchor) {
        if (scope.current_anchor) {
          scope.current_anchor.classList.remove('current');
        }
        anchor.classList.add('current');
        scope.current_anchor = anchor;
      };
      var refresh = function() {
        var window_pathname = $window.location.pathname;
        var anchors = element.find('a');
        var i, anchor;
        // try for exact matches first
        for (i = 0; (anchor = anchors[i]); i++) {
          if (window_pathname == anchor.pathname) {
            return updateCurrent(anchor);
          }
        }
        // then for anchors with a prefix of the current url
        for (i = 0, anchor; (anchor = anchors[i]); i++) {
          if (window_pathname.indexOf(anchor.pathname) === 0) {
            return updateCurrent(anchor);
          }
        }
      };
      // $rootScope.$on('$locationChangeSuccess', function(ev, newUrl, oldUrl) {})
      refresh();
    }
  };
});
