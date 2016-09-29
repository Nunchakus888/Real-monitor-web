'use strict';

angular.module('appModule', ['avalon.ui', 'ui.grid', 'ui.grid.edit', 'ui.grid.resizeColumns', 'ui.grid.pagination', 'ui.grid.selection', 'highcharts-ng', 'my.ui.grid.autoResize', 'ngResource', 'ui.bootstrap'])
.controller('appController', ['$scope', 'dataFactory', function ($scope, dataFactory) {

    $scope.login = function (username, password) {
        dataFactory.loginApi.login({
            username: username,
            password: password
        }).$promise
        .then(function (res) {
            console.log(res);
            if (res.data) {
                dataFactory.tableVm = res.data;
                $scope.input_username = username;
                $scope.input_password = password;
                $scope.tableView = 'static/templates/monitorTable.html';
                //用户信息存入本地缓存
                localStorage.setItem('username', username);
                localStorage.setItem('password', password);
            }
        })
        .catch(function (err) {
            console.log(err);
            return false;
        });
    };

    $scope.logout = function () {
        dataFactory.logoutApi.logout({
            username: $scope.input_username,
            password: $scope.input_password
        }).$promise
        .then(function (res) {
            console.log(res);
            if (res) {
                $scope.tableView = '/static/templates/loginView.html';
                localStorage.clear();
            }
        })
        .catch(function (err) {
            console.log(err);
            return false;
        });
    };

    //重新加载页面之前关闭websocket
    window.onbeforeunload = function () {
        dataFactory.closeWebsocket();
    };


    var username = localStorage.getItem('username'),
        password = localStorage.getItem('password');
    if (username && password) {
        $scope.login(username, password);
    } else {
        $scope.tableView = '/static/templates/loginView.html';
    }

}]);