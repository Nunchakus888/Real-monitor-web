'use strict';

angular.module('appModule').controller('tableController', ['$scope', '$interval', 'dataFactory', function ($scope, $interval, dataFactory) {

    $scope.autoSysException = {};
    $scope.monitorTable = {};
    $scope.heartbeatData = {};
    $scope.queryApiByTakeTime = 1000;
    var heartbeat = {};

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
            ]
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
            // {name: CLASSNAME + "", displayName: "类名", width: 280},
            // {name: METHOD + "", displayName: "方法名", width: 100},
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
                $scope.getApiByTakeTime(row, $scope.queryApiByTakeTime);
                $scope.currentSelectionRow = row;
                $scope.queryApiByTakeTime = 1000;//换行~恢复默认值
            });

            //表格数据分页
            var beforePage = 0;
            gridApi.pagination.on.paginationChanged($scope, function (newPage, pageSize) {
                if (beforePage < newPage) {
                    dataFactory.queryLog.query({
                        page: newPage,
                        size: pageSize
                    }).$promise
                    .then(function (res) {
                        if (res.data) {
                            $scope.defaultChartsData(res.data);
                            for (var i in res.data) {
                                $scope.monitorTable.gridOptions.data.push(res.data[i]);
                            }
                        }
                    })
                    .catch(function (err) {
                        console.log(err);
                        return false;
                    });
                    beforePage = newPage;
                }
            });

            $scope.defaultChartsData = function (data) {
                var arrayToData = {};
                var arrayToDataList = [];
                for (var i in data) {
                    data[i]['y'] = data[i][SQL_TAKETIME + ''];
                    for (var j in data[i]) {
                        arrayToData[j] = data[i][j];
                    }
                    arrayToDataList[i] = arrayToData;
                    arrayToData = {};
                }
                $scope.apiOperationChart.series[0].data = arrayToDataList;
            };
            $scope.defaultChartsData(dataFactory.tableVm);//图表默认填充数据

        }
    };

    //主monitor表格数据
    $scope.monitorTable.gridOptions.data = dataFactory.tableVm;


    // $scope.autoSysException.gridOptions = {
    $scope.heartbeatData.gridOptions = {
        paginationPageSizes: [],
        paginationPageSize: 10,

        columnDefs: [
            {name: "Description", field: "Description", displayName: "Description"},
            {name: "Group", field: "Group", displayName: "Group"},
            {name: "JobList0.Description",field:'JobList[0].Description', displayName: "JobList0.Description"},
            {name: "JobList0.Group",field:'JobList[0].Group', displayName: "JobList0.Group"},
            {name: "JobList0.Name",field:'JobList[0].Name', displayName: "JobList0.Name"},

            {name: "JobList0.Triggers0.Triggers.Description",field:'JobList[0].Triggers[0].Description', displayName: "JobList0.Triggers0.Triggers.Description"},
            {name: "JobList0.Triggers0.Triggers.Group",field:'JobList[0].Triggers[0].Group', displayName: "JobList0.Triggers0.Triggers.Group"},
            {name: "JobList0.Triggers0.Triggers.Name",field:'JobList[0].Triggers[0].Name', displayName: "JobList0.Triggers0.Triggers.Name"},
            {name: "JobList0.Triggers0.Triggers.NextFireTime",field:'JobList[0].Triggers[0].NextFireTime', displayName: "JobList0.Triggers0.Triggers.NextFireTime"},
            {name: "JobList0.Triggers0.Triggers.PreviousFireTime",field:'JobList[0].Triggers[0].PreviousFireTime', displayName: "JobList0.Triggers0.Triggers.PreviousFireTime"},
            {name: "JobList0.Triggers0.Triggers.State",field:'JobList[0].Triggers[0].State', displayName: "JobList0.Triggers0.Triggers.State"},

            {name: "JobList1.Triggers0.Triggers.Description",field:'JobList[1].Triggers[0].Description', displayName: "JobList0.Triggers0.Triggers.Description1"},
            {name: "JobList1.Triggers0.Triggers.Group",field:'JobList[1].Triggers[0].Group', displayName: "JobList0.Triggers0.Triggers.Group1"},
            {name: "JobList1.Triggers0.Triggers.Name",field:'JobList[1].Triggers[0].Name', displayName: "JobList0.Triggers0.Triggers.Name1"},
            {name: "JobList1.Triggers0.Triggers.NextFireTime",field:'JobList[1].Triggers[0].NextFireTime', displayName: "JobList0.Triggers0.Triggers.NextFireTime1"},
            {name: "JobList1.Triggers0.Triggers.PreviousFireTime",field:'JobList[1].Triggers[0].PreviousFireTime', displayName: "JobList0.Triggers0.Triggers.PreviousFireTime1"},
            {name: "JobList1.Triggers0.Triggers.State",field:'JobList[1].Triggers[0].State', displayName: "JobList0.Triggers0.Triggers.State1"},
        ],

        enableRowSelection: true,
        enableRowHeaderSelection: false,
        enableCellEditOnFocus: true,
        multiSelect: false,
        enableCellEdit: true,
        noUnselect: true
    };


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
            dataNum: $scope.perPageData,
            timeLine: num  //筛选耗时大于timeLine 的数据
        }).$promise
        .then(function (res) {
            if (res.data) {
                var arrayDataObj = [],
                    arrayDataObi = {};
                for (var i in res.data) {
                    res.data[i]['y'] = res.data[i][SQL_TAKETIME + ''];
                    for (var j in res.data[i]) {
                        arrayDataObi[j] = res.data[i][j];
                    }
                    arrayDataObj[i] = arrayDataObi;
                    arrayDataObi = {};//empty this object every usage~
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

    dataFactory.openWebSocket(function (data) {
        var data = JSON.parse(data.data);
        if(Object.prototype.toString.call(data) === '[object Array]'){
            console.log('array');
            for(var i in data){
                $scope.monitorTable.gridOptions.data.unshift(data[i]);
            }
            $scope.defaultChartsData(data);//更新图表数据

        }else {
            console.log('heartbeat');
            $scope.heartbeatData.gridOptions.data.unshift(data.content);
            $scope.$apply();
        }

    });

}]);