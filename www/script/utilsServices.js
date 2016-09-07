'use strict';

angular.module('appModule').factory('dataFactory', function ($resource, $location) {
    this.loginApi = $resource('/login', {}, {login: {method: 'POST'}});
    this.logoutApi = $resource('/logout', {}, {logout: {method: 'POST'}});
    this.queryLog = $resource('/queryLog', {}, {query: {method: 'POST'}});
    this.queryApi = $resource('/queryApi', {}, {query: {method: 'POST'}});
    this.tableVm = {};

    var that = this;
    this.openWebSocket = function (callback) {
        var ws = new WebSocket('ws://' + $location.host() + ':' + $location.port() + '/websocket');
        that.ws = ws;
        ws.onopen = function (evt) {
            console.log("opne:");
        };

        ws.onmessage = function (res) {
            callback(res);
        };
    };

    this.sendMessage = function (message) {
        if (that.ws.readyState === 1) {
            that.ws.send(message);
            return;
        }
        that.openWebSocket();
        that.ws.send(message);
    };

    this.closeWebsocket = function () {
        if (that.ws) {
            that.ws.close();
            that.ws = undefined;
        }
    };

    return this;
});