/*jslint browser: true, devel: true */ /*globals _, angular, p */
var app = angular.module('app', ['ngStorage'], function($interpolateProvider) {
  $interpolateProvider.startSymbol('<%');
  $interpolateProvider.endSymbol('%>');
});


app.controller('ResponsesCtrl', function($scope, $localStorage, $http) {
  $scope.$storage = $localStorage.$default({
    filter: {
      experiment_id: null,
      stimulus_id: null,
      user_id: null,
    }
  });

  $scope.refilter = function() {
    $http({method: 'GET', url: '/admin/filters', params: $scope.$storage.filter}).
      then(function(res) {
        $scope.filters = res.data;
      }, function(res) {
        p('GET /admin/filters failed!', res);
      });

    $http({method: 'GET', url: '/admin/responses', params: $scope.$storage.filter}).
      then(function(res) {
        $scope.total = res.data.total;
        $scope.responses = res.data.rows;
      }, function(res) {
        p('GET /admin/filters failed!', res);
      });
  };
  $scope.refilter();

  $scope.clearFilters = function() {
    $scope.$storage.filter = {};
    $scope.refilter();
  };




});
