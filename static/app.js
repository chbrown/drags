/*jslint browser: true, devel: true */ /*globals _, angular, p */
var app = angular.module('app', ['ngStorage'], function($interpolateProvider) {
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

app.controller('ResponsesCtrl', function($scope, $localStorage, $http) {
  $scope.$storage = $localStorage.$default({
    filter: {}
  });

  // initialize with distinct user/stimulus/experiment ids
  $http({method: 'GET', url: '/admin/responses/distinct-ids'}).
    then(function(res) {
      $scope.distinct = res.data;
    }, function(res) {
      p('$http() failed', res);
    });


  // true enables deep checking
  $scope.$watch('$storage.filter', function(new_value, old_value) {
    $scope.refresh();
  }, true);

  $scope.loadDistinctValues = function() {
    var params = {
      stimulus_id: $scope.$storage.filter.stimulus_id
    };
    $http({method: 'GET', url: '/admin/responses/values', params: params}).
      then(function(res) {
        $scope.stimulus_values = res.data.values;
      }, function(res) {
        p('$http() failed', res);
      });
  };
  $scope.loadDistinctValues();

  $scope.refresh = function() {
    var params = {
      experiment_id: $scope.$storage.filter.experiment_id,
      stimulus_id: $scope.$storage.filter.stimulus_id,
      value: $scope.$storage.filter.value,
    };
    $http({method: 'GET', url: '/admin/responses.json', params: params}).
      then(function(res) {
        $scope.total = res.data.total;
        $scope.responses = res.data.rows;
      }, function(res) {
        p('GET /admin/responses.json failed!', res.data, res);
      });
  };
  $scope.refresh();

  $scope.clickDebounce = function(ev) {
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
