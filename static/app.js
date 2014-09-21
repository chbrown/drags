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

  $scope.export_links = [
    {name: 'Download', download: 'true'},
    {name: 'Preview', download: 'false'},
  ];

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
