'use strict';
// 使用avalon.ui模块， controller，directive都注册到这里，注意避免命名重复
angular.module('avalon.ui', []).directive("ssCheckboxDirective", [
    function () {

        var injectedCtrl = [
            '$scope', function ($scope) {
                $scope.onClick = function () {
                    if (!$scope.isNoBindModel) {
                        $scope.value = !$scope.value;
                    }
                };

            }
        ];

        return {
            restrict: 'C',
            controller:injectedCtrl,
            replace: true,
            template: '<div class="ss-input-control ss-checkbox" ng-click="onClick()">\
                           <input type="checkbox" ng-model="value"  ng-disabled="{{isDisabled}}">\
                           <i class="check ss-icon ss-icon-primary ss-icon-checkbox-{{value?\'selected\':\'unselected\'}}" ng-disabled="{{isDisabled}}"></i>\
                           <span class="caption" ng-bind="label"></span>\
                   <div>',
            scope: {
                value: "=ngModel",
                label: "@ssLabel",
                updateModel: "&ngChange",
                type: "@type",
                isDisabled: "=ngDisabled"
            },
            compile: function (el, attr) {
                return {
                    pre: function preLink(scope, element, attributes) {
                        if (attributes.ngModel === undefined) scope.isNoBindModel = true;
                    },
                    post: function postLink(scope, element, attributes) {

                    }
                };
            }
        };

    }]);