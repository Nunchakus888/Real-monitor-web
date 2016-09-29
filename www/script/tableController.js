'use strict';

angular.module('appModule').controller('tableController', ['$scope', '$interval', 'dataFactory', function ($scope, $interval, dataFactory) {

    $scope.autoSysException = {};
    $scope.monitorTable = {};
    $scope.apiDataTable = {};
    $scope.queryApiByTakeTime = 1000;

    $scope.apiOperationChart = {
        options: {
            chart: {
                type: 'column'
            },

            legend: {
                enabled: false //x轴控制折线显隐
            },

            credits: {//水印
                enabled: false
            },

            tooltip: {
                style: {
                    padding: 5,
                    fontWeight: 'bold',
                },

                enabled: true,
                formatter: function () {
                    return '' +
                        'ID:' + ( this.point[LOGID + '']) + '<br/>' +
                        'API:' + ( this.point[APINAME + ''] || '' ) + '<br/>' +
                        '耗时: ' + this.y + 'ms<br/>' +
                        'sql执行查询条数: ' + this.point[SQL_ROWCOUNT + ''] + '<br/>' +
                        'sql执行查询的列数: ' + this.point[SQL_COLCOUNT + ''] + '<br/>' +
                        '日志产生时间: ' + this.point[CREATETIME + ''] + '<br/>' +
                        '用户:' + ( this.point[USERNAME + ''] || '' ) + '<br/>' +
                        '日志级别: ' + this.point[LOGLEVEL + ''] + '<br/>' +
                        '类名: ' + this.point[CLASSNAME + ''] + '<br/>' +
                        '方法名: ' + this.point[METHOD + ''] + '<br/>' +
                        '数据源ID: ' + this.point[DATA_SOURCE_ID + ''] + '<br/>' +
                        '执行SQL: ' + this.point[MSG_DETAIL + ''].substr(0, 200) + '<br/>' +
                        '日志信息:' + this.point[MSG + ''] + '<br/>';
                }
            }
        },

        series: [{
            name: 'API',
            data: [
                // {y:1229.7,extra:'hhh', hello:'world', a:'b'},
            ],
            turboThreshold: 0
        }],
        title: {
            text: 'API'
        },
        subtitle: {
            text: ''
        },
        loading: false,
        xAxis: {
            type: 'category',
            // categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            // currentMin: 0,
            // currentMax: 60,
            title: ''
        },
        //纵轴
        yAxis: {
            title: {
                text: '耗时/ms'
            }
        },
        useHighStocks: false,
        size: {
            // width: 600,
            // height: 600
        },
        func: function (chart) {
            console.log("chartchartchart");
            console.log(chart);
        }
    };

    $scope.monitorTable.gridOptions = {

        columnDefs: [
            {name: LOGID + "", displayName: "日志id", width: 60},
            {name: LOGTYPE + "", displayName: "日志类型", width: 60},
            {name: USERNAME + "", displayName: "用户名", width: 60},
            {name: CLASSNAME + "", displayName: "类名", width: 280},
            {name: METHOD + "", displayName: "方法名", width: 100},
            {name: CREATETIME + "", displayName: "日志产生时间", width: 200},
            {name: LOGLEVEL + "", displayName: "日志级别", width: 60},
            {name: MSG + "", displayName: "日志信息（错误ID,错误名称）", width: 200},
            {name: APINAME + "", displayName: "执行的api名称", width: 180},
            {name: MSG_DETAIL + "", displayName: "执行SQL"},
            {name: SQL_ROWCOUNT + "", displayName: "sql查询条数", width: 120},
            {name: SQL_COLCOUNT + "", displayName: "sql查询列数", width: 120},
            {name: SQL_TAKETIME + "", displayName: "sql执行耗时/ms", width: 120},
            {name: DATA_SOURCE_ID + "", displayName: "数据源ID", width: 60}
        ],

        enableSorting: true,
        paginationPageSizes: [],
        paginationPageSize: 15,
        enableColumnMenu: false,
        enableRowSelection: true,
        enableRowHeaderSelection: false,
        enableCellEditOnFocus: true,
        multiSelect: false,
        enableCellEdit: true,
        noUnselect: true,
        minRowsToShow: 14,
        enableColumnResizing: true,

        onRegisterApi: function (gridApi) {

            gridApi.selection.on.rowSelectionChanged($scope, function (row) {
                $scope.queryApiByTakeTime = 1000;//换行~恢复默认值
                $scope.getApiByTakeTime(row, $scope.queryApiByTakeTime);
                $scope.currentSelectionRow = row;
            });

            gridApi.pagination.on.paginationChanged($scope, function (newPage, pageSize) {
                $scope.paginationChanged(newPage, pageSize, $scope.monitorTable.gridOptions.data, 'log');
            });
        }
    };

    //图表填充数据 Array->Object
    $scope.defaultChartsData = function (data, tag) {
        var arrayToData = {},
            arrayToDataList = [];
        for (var i in data) {
            data[i]['y'] = data[i][SQL_TAKETIME + ''];
            for (var j in data[i]) {
                arrayToData[j] = data[i][j];
            }
            arrayToDataList[i] = arrayToData;
            arrayToData = {};
        }

        if (tag){
            $scope.apiOperationChart.series[0].data = $scope.apiOperationChart.series[0].data.concat(arrayToDataList);
        }else{
            $scope.apiOperationChart.series[0].data = arrayToDataList;
        }
    };

    //表格数据分页
    var logBeforePage = 0,
        apiBeforePage = 0;
    $scope.paginationChanged = function (newPage, pageSize, tableDate, dataType) {
        var beforePage = 0;
        dataType === 'api' ? beforePage = apiBeforePage : beforePage = logBeforePage;
        if (beforePage < newPage) {
            dataFactory.queryLog.query({
                page: newPage,
                size: pageSize,
                dataType: dataType
            }).$promise
            .then(function (res) {
                if (res.data) {
                    if(dataType == 'log'){
                        if(newPage !== 2){
                            $scope.currentSelectionRow = undefined;
                            $scope.defaultChartsData($scope.prePaginationData);
                            $scope.prePaginationData = res.data;
                        }else {
                            $scope.prePaginationData = res.data;
                            $scope.defaultChartsData(dataFactory.tableVm.slice(15, 30));
                        }
                    }

                    for (var i in res.data) {
                        tableDate.push(res.data[i]);
                    }
                }
            })
            .catch(function (err) {
                console.log(err);
                return false;
            });
            dataType === 'api' ? apiBeforePage = newPage : logBeforePage = newPage;
        }
    };

    //主monitor表格数据
    $scope.monitorTable.gridOptions.data = dataFactory.tableVm;

    var preRowSecection = '';
    $scope.getApiByTakeTime = function (row, num) {
        if (num === 1000) {//num值变化,重新加载数据~
            //重复选取同一API不刷新页面&不加载数据
            if (preRowSecection === row.entity[APINAME + '']) {
                return false;
            }
        }

        preRowSecection = row.entity[APINAME + ''];
        $scope.apiOperationChart.title.text = 'API:' + (row.entity[APINAME + ''] || '暂无数据');

        $scope.apiOperationChart.series[0].data = [];
        dataFactory.queryApi.query({
            apiName: row.entity[APINAME + ""],
            timeLine: num  //筛选耗时大于timeLine 的数据
        }).$promise
        .then(function (res) {
            console.log(res);
            if (res.data) {
                var arrayDataObj = [],
                    arrayDataObi = {};
                for (var i in res.data) {
                    res.data[i]['y'] = res.data[i][SQL_TAKETIME + ''];
                    for (var j in res.data[i]) {
                        arrayDataObi[j] = res.data[i][j];
                    }
                    arrayDataObj[i] = arrayDataObi;
                    arrayDataObi = {};//empty this object each usage~
                }
                $scope.apiOperationChart.series[0].data = arrayDataObj;
            }
        })
        .catch(function (err) {
            console.log(err);
            return false;
        });
    };


    $scope.changeShow = function () {
        $scope.apiOperationChart.options.chart.type === 'column' ? $scope.apiOperationChart.options.chart.type = 'line' : $scope.apiOperationChart.options.chart.type = 'column';
    };

    $scope.clickToGetApiByDifferentTakeTime = function (tag) {
        $scope.queryApiByTakeTime += tag;
        $scope.getApiByTakeTime($scope.currentSelectionRow, $scope.queryApiByTakeTime);
    };

    $scope.websocketConnect = function () {
        dataFactory.openWebSocket(function (data) {
            var data = JSON.parse(data.data);
            if (Object.prototype.toString.call(data) === '[object Array]') {
                console.log('array');
                for (var i in data) {
                    $scope.monitorTable.gridOptions.data.unshift(data[i]);
                }
                $scope.defaultChartsData(data, true);//更新图表数据
            } else if (data === false) {//心跳异常
                $scope.exceptionName = 'heartbeat心跳异常';
            } else if (data.type === 'exception') {
                $scope.exceptionName = 'AutoSys异常';
            }
        });
    };

    $scope.websocketConnect();

    /*
     * heartbeat:
     * 1.    心跳正常
     * 0.    websocket断开连接
     * -1.   心跳异常
     */
    $interval(function () {
        if (dataFactory.checkWebsocketStatus()) {
            $scope.websocketDisconnecttooltip = true;
            $scope.exceptionName = 'websocket连接中断,正在自动重连...';
            $scope.websocketConnect();//自动重连~
        } else {
            $scope.websocketDisconnecttooltip = false;
        }
    }, 3000);


    $scope.cellTemplateHtml = function(tag){
        var requiredTag = '';
        $scope.editableCellValue = false;
        tag == DATA_SOURCE_ID || tag == API_NAME || tag == VERSION ? requiredTag = '必填' : (tag == AVAILABLE_FLAG ? requiredTag = '一个字符或不填' : '');
        return '<div ng-show="!row.entity.editable" class=\"ui-grid-cell-contents\">{{COL_FIELD}}</div>' +
            '<div style="height:100%;" ng-show="row.entity.editable">' +
                '<input ng-required="'+!!requiredTag+'" placeholder="'+requiredTag+'" ng-readonly="grid.appScope.editableCellValue" ng-focus="grid.appScope.editableGridCellOnFocus(row, '+tag+')" type="text" style="height:100%;" ng-model="row.entity['+tag+']" ng-change="grid.appScope.changeGridValue(row)" ng-model-options="{updateOn:\'blur\'}">' +
            '</div>';
    };

    $scope.editableGridCellOnFocus = function (row, tag) {
        if($scope.addnewapiFlag){//add new api~
            return false;
        }else {//update api~
            if(tag == DATA_SOURCE_ID || tag == API_NAME || tag == VERSION){
                if(row.entity[tag]) $scope.editableCellValue = true;
            }else{
                $scope.editableCellValue = false;
            }
        }
    };

    //Call this function when grid cell's value changed
    $scope.changeGridValue = function(row){
        angular.element(document.querySelector('#cancel_'+row.uid)).removeClass('dspn');
        if($scope.addnewapiFlag)
            if(!(row.entity[DATA_SOURCE_ID + ""] && row.entity[API_NAME + ""] && row.entity[VERSION + ""] && (row.entity[AVAILABLE_FLAG + ""] ? row.entity[AVAILABLE_FLAG + ""].length == 1 : true))){
                angular.element(document.querySelector('#submit_'+row.uid)).addClass('dspn');
            }else {
                angular.element(document.querySelector('#update_'+row.uid)).addClass('dspn');
                angular.element(document.querySelector('#submit_'+row.uid)).removeClass('dspn');
            }
        else {
            angular.element(document.querySelector('#update_'+row.uid)).addClass('dspn');
            angular.element(document.querySelector('#submit_'+row.uid)).removeClass('dspn');
        }
    };

    var preRowData = [],
        updateValues = [];
    $scope.cellsEdit = function(row) {
        for(var i in row.entity){
            preRowData[i] = row.entity[i];
        }

        if(row.entity[API_NAME + ""] != ""){
            $scope.updateType = row.entity[API_NAME + ""];
        }else {
            $scope.updateType = 'add';//add api
            angular.element(document.querySelector('#cancel_'+row.uid)).removeClass('dspn');
        }

        if($scope.isPreRow === row){
            $scope.isPreEdit = false;
            $scope.isPreRow.entity.editable = !$scope.isPreRow.entity.editable;
        }else {
            $scope.isPreRow ? $scope.isPreRow.entity.editable = false : $scope.isPreRow;
            $scope.isPreRow = row;
            row.entity.editable = !row.entity.editable;
            $scope.isPreEdit = true;
        }
    };

    $scope.submitUpdate = function(row) {
        if(!(row.entity[DATA_SOURCE_ID + ""] && row.entity[API_NAME + ""] && row.entity[VERSION + ""] && (row.entity[AVAILABLE_FLAG + ""] ? row.entity[AVAILABLE_FLAG + ""].length == 1 : true))) return false;
        row.entity.editable = false;
        angular.element(document.querySelector('#update_'+row.uid)).removeClass('dspn');
        angular.element(document.querySelector('#submit_'+row.uid)).addClass('dspn');
        angular.element(document.querySelector('#cancel_'+row.uid)).addClass('dspn');
        for(var i in preRowData){
            updateValues[i] = "";
            for(var j = i; j < row.entity.length; j = j + 1){
                if(preRowData[i] !== row.entity[j]){
                    if(j != CREATE_TIME){
                        updateValues[j] = row.entity[j];
                    }
                }
                break;
            }
        }
        if(updateValues[CREATE_TIME + ""] == ""){//CREATE_TIME
            updateValues[CREATE_TIME + ""] = new Date().format("yyyy-MM-dd hh:mm:ss");
        }
        updateValues[LAST_MODIFY_TIME + ""] = new Date().format("yyyy-MM-dd hh:mm:ss");//LAST_MODIFY_TIME

        dataFactory.updateApi.update({
            newApiData: updateValues,
            type: $scope.updateType
        }).$promise.then(function (res) {
            updateValues = [];
            if(res.error){
                console.log(res.error);
                $scope.editApiErrorFlag = true;
                $scope.editApiError = res.error;
            }
        })
        .catch(function (err) {
            console.log(err);
            return false;
        });
        $scope.addnewapiFlag = false;
        $scope.getAllApiData();
    };


    $scope.addApiData = function(){
        var tempArr = [];
        for(var i=0; i<20; i++){
            tempArr[i] = "";
        }
        $scope.apiDataTable.gridOptions.data.unshift(tempArr);
        $scope.addnewapiFlag = true;
    };


    $scope.cancelUpdate = function(row){
        if(!row.entity[API_NAME + ""]){
            $scope.cancelAddApi(row);
            return false;
        }
        row.entity = preRowData;
        row.entity.editable = false;
        angular.element(document.querySelector('#update_'+row.uid)).removeClass('dspn');
        angular.element(document.querySelector('#submit_'+row.uid)).addClass('dspn');
        angular.element(document.querySelector('#cancel_'+row.uid)).addClass('dspn');
    };

    $scope.cancelAddApi = function(row){
        console.log(row.uid);
        angular.element(document.querySelector('#cancel_'+row.uid)).addClass('dspn');
        $scope.apiDataTable.gridOptions.data.splice(0, 1);
        $scope.addnewapiFlag = false;
    };

    $scope.apiDataTable.gridOptions = {
        columnDefs: [
            {name: DATA_SOURCE_ID + "", displayName: "数据源ID", cellTemplate:$scope.cellTemplateHtml(DATA_SOURCE_ID + "")},
            {name: DATA_SOURCE_DB_ID + "", displayName: "数据源数据库ID", cellTemplate:$scope.cellTemplateHtml(DATA_SOURCE_DB_ID + "")},
            {name: API_NAME + "", displayName: "API名称", cellTemplate:$scope.cellTemplateHtml(API_NAME + "")},
            {name: INPUT_ARGS + "", displayName: "入参", cellTemplate:$scope.cellTemplateHtml(INPUT_ARGS + "")},
            {name: OUTPUT_ARGS + "", displayName: "出参", cellTemplate:$scope.cellTemplateHtml(OUTPUT_ARGS + "")},
            {name: LOGIC_SQL + "", displayName: "取数逻辑", cellTemplate:$scope.cellTemplateHtml(LOGIC_SQL + "")},
            {name: API_GROUPS + "", displayName: "所在的API组", cellTemplate:$scope.cellTemplateHtml(API_GROUPS + "")},
            {name: VERSION + "", displayName: "版本号", cellTemplate:$scope.cellTemplateHtml(VERSION + "")},
            {name: COMMENTS + "", displayName: "备注", cellTemplate:$scope.cellTemplateHtml(COMMENTS + "")},
            {name: AVAILABLE_FLAG + "", displayName: "有效性标志", cellTemplate:$scope.cellTemplateHtml(AVAILABLE_FLAG + "")},
            {name: CREATOR + "", displayName: "创建人", cellTemplate:$scope.cellTemplateHtml(CREATOR + "")},
            {name: CREATE_TIME + "", displayName: "创建时间", width:160},
            {name: LAST_MODIFY_PERSON + "", displayName: "最后更改人", cellTemplate:$scope.cellTemplateHtml(LAST_MODIFY_PERSON + "")},
            {name: LAST_MODIFY_TIME + "", displayName: "最后修改时间", width:160},
            {name: IS_WHERE_AVAILABLE + "", displayName: "哪里可用", cellTemplate:$scope.cellTemplateHtml(IS_WHERE_AVAILABLE + "")},
            {name: FORCE_CONDITION + "", displayName: "强制条件", cellTemplate:$scope.cellTemplateHtml(FORCE_CONDITION + "")},
            {name: DATE_COLUMN + "", displayName: "日期列", cellTemplate:$scope.cellTemplateHtml(DATE_COLUMN + "")},
            // {name: EXTRA1 + "", displayName: "附加1", cellTemplate:$scope.cellTemplateHtml(EXTRA1 + "")},
            // {name: EXTRA2 + "", displayName: "附加2", cellTemplate:$scope.cellTemplateHtml(EXTRA2 + "")},
            // {name: EXTRA3 + "", displayName: "附加3", cellTemplate:$scope.cellTemplateHtml(EXTRA3 + "")},
            {name: 'update',  displayName: "修改",width:50,
                cellTemplate:
                    '<button id="update_{{row.uid}}" ng-click="grid.appScope.cellsEdit(row)" class="btn btn-xs btn-default">\
                        <i class="fa fa-pencil"></i>\
                    </button>\
                    <button id="submit_{{row.uid}}" type="submit" ng-click="grid.appScope.submitUpdate(row)" class="dspn btn btn-xs btn-default">\
                        <i class="fa fa-check"></i>\
                    </button>\
                    <button id="cancel_{{row.uid}}" type="button" ng-click="grid.appScope.cancelUpdate(row)" class="dspn btn btn-xs btn-default">\
                        <i class="fa fa-times"></i>\
                    </button>'
            }
        ],

        enableSorting: true,
        paginationPageSizes: [],
        paginationPageSize: 15,
        enableColumnMenus: false,
        enableRowSelection: true,
        enableRowHeaderSelection: false,
        enableCellEditOnFocus: true,
        multiSelect: false,
        enableCellEdit: false,
        noUnselect: true,
        enableColumnResizing: true,

        onRegisterApi: function (gridApi) {

            gridApi.pagination.on.paginationChanged($scope, function (newPage, pageSize) {
                $scope.paginationChanged(newPage, pageSize, $scope.apiDataTable.gridOptions.data, 'api');
            });

            gridApi.selection.on.rowSelectionChanged($scope, function (row) {
                if($scope.isPreEdit){
                    $scope.isPreEdit = false;
                }else{
                    if($scope.isPreRow){
                        $scope.isPreRow.entity.editable = false;
                    }
                }
            });
            $scope.defaultChartsData(dataFactory.tableVm.slice(0, 15));//图表默认填充数据
        }
    };

    $scope.getAllApiData = function () {
        dataFactory.apidataApi.query().$promise
        .then(function (res) {
            $scope.apiDataTable.gridOptions.data = res.data;
        })
        .catch(function (err) {
            console.log(err);
            return false;
        });
    };

    $scope.getAllApiData();

    $scope.editApiErrorTip = function(){
		$scope.editApiErrorFlag = false;
	}

}]);