'use strict';

angular.module('appModule').factory('dataFactory', function ($resource, $location) {
    this.loginApi = $resource('/login', {}, {login: {method: 'POST'}});
    this.logoutApi = $resource('/logout', {}, {logout: {method: 'POST'}});
    this.queryLog = $resource('/queryLog', {}, {query: {method: 'POST'}});
    this.queryApi = $resource('/queryApi', {}, {query: {method: 'POST'}});
    this.updateApi = $resource('/updateApi', {}, {update: {method: 'POST'}});
    this.apidataApi = $resource('/apidataApi', {}, {query: {method: 'POST'}});
    this.tableVm = {};

    Date.prototype.format = function (format) {
        var args = {
            "M+": this.getMonth() + 1,
            "d+": this.getDate(),
            "h+": this.getHours(),
            "m+": this.getMinutes(),
            "s+": this.getSeconds(),
            "q+": Math.floor((this.getMonth() + 3) / 3),  //quarter
            "S": this.getMilliseconds()
        };

        if (/(y+)/.test(format))
            format = format.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));

        for (var i in args) {
            var n = args[i];
            if (new RegExp("(" + i + ")").test(format))
                format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? n : ("00" + n).substr(("" + n).length));
        }
        return format;
    };

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

    this.checkWebsocketStatus = function () {
        if (that.ws && that.ws.readyState === 1) {
            return false;
        }
        return true;
    };

    return this;
});