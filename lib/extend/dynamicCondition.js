layui.define(['jquery','form', 'laydate', 'table'], function (exports) {
    "use strict";
    var $ = layui.$,
        MOD_NAME = 'dynamicCondition',
        table = layui.table,
        // layer = layui.layer,
        laydate = layui.laydate,
        form = layui.form


    var dynamicCondition = {
        //缓存创建的实例
        cacheInstance: {},

        // 获取实例
        // instanceName:实例名称。非必须。默认为'instanceName'.当一个页面只创建一个实例时，可以不用该参数
        getInstance: function (instanceName) {
            instanceName = instanceName || 'instanceName';
            return this.cacheInstance[instanceName];
        },
        /***
         * elem/fields/fieldsJsonStr：三选一.
         * tableId/queryCallBack: 二选一。tableId对应table.render(config)的config.id参数.自动重载表格。queryCallBack()则自定义回调
         * strategyId: 显示查询策略的面板选择器。非必须。例子："#frm"
         * instanceName: 创建的实例名称。非必须。默认为'instanceName'。当一个页面只创建一个实例时，可以不用该参数
         */
        create: function (config) {

            /**config 参数
             * 
             * {
             *  fields：[{
             *      field: "id", // 自定义
             *      title: "id", // 自定义
             *      edit: "text", // text/select/date  文本/下拉框/日期   三选一
             *      dateType: "date" // 当 edit 为 date 时可选 不填默认为date 可选 year/month/date/time/datetime  详见https://www.layui.com/doc/modules/laydate.html#type
             *      layVerify: "number|required" // required（必填项）/phone（手机号）email（邮箱）url（网址）number（数字）date（日期）
             *      templet: "#selectSex"  // 当 edit 为 select 时可选
             *  }],
             *  strategyId:'#box',
             *  queryCallBack:function(data){},
             *  strategyClick: function (dom, data){}
             *  delStrategy:function(){}
             *  delAll: function (){}
             *  delOther: function (){}
             * 
             *  url:'', // 后台查询接口地址
             *  tableId:'' // 需渲染的目标表格 ID
             * }
             * 
             */

            // config.type = config.type || 'complex'; // 默认为复杂模式
            config.instanceName = config.instanceName || 'instanceName';
            var findInstance = createFindInstance(config);
            //初始化findInstance.data 
            if (config.fields) {
                findInstance.data = config.fields;
            } else if (config.fieldsJsonStr) {
                findInstance.data = JSON.parse(config.fieldsJsonStr);
            } else if (config.tableId) { //指定表格容器的id选择器.示例"listTable"
                var cols = $('#' + config.tableId).siblings('div.layui-table-view').children('div.layui-table-box').children('div.layui-table-header').find("tr");

                // 可能存在多级表头， 需加一层循环
                for (let i = 0; i < cols.length; i++) {
                    const thItems = $(cols[i]).find('th');
                    for (let i = 0; i < thItems.length; i++) {
                        var thItem = thItems[i];

                        if ($(thItem).hasClass('layui-table-col-special') || $(thItem).attr('data-field') == 'checkbox') { // 特殊列：复选框，单选框，空列，工具列, 多级表头的总结头等等
                            if ($(thItem).children('div.laytable-cell-checkbox').length != 0) { // 复选框列可加入条件查询， 其他特殊列忽略
                                findInstance.data.push({
                                    field: 'checkbox',
                                    title: '复选框',
                                    edit: 'select',
                                    templet: '<select><option value=""></option><option value="1">已选中</option><option value="0">未选中</option></select>'
                                })
                            }
                        } else {
                            var field = $(thItem).attr('data-field').toLocaleLowerCase(),
                                conditonItem = {
                                    field: $(thItem).attr('data-field'),
                                    title: $(thItem).find('span').html(),
                                    edit: 'text'
                                };
                            if (field == 'sex') { // 性别列
                                conditonItem.edit = 'select';
                                conditonItem.templet = '<select><option value=""></option><option value="1">男</option><option value="0">女</option></select>';
                            } else if (field == 'phone') { // 手机号码
                                conditonItem.layVerify = 'phone';
                            } else if (field == 'date' || field == 'time' || field == 'birthday') { // 生日，日期
                                conditonItem.edit = 'date';
                            } else if (field == 'email') { // 邮箱
                                conditonItem.layVerify = 'email';
                            }
                            findInstance.data.push(conditonItem)
                        }
                    }
                }
            }

            // 右键菜单
            if ($(config.strategyId).find('#strategyOperation').length == 0) {
                $(config.strategyId).append(`
                        <style>#strategyOperation li{padding-left: 10px;}#strategyOperation li:hover{background-color:#1E9FFF;}</style>
                        <ul id="strategyOperation" 
                            style="color:#fff;cursor: pointer;border-radius: 4px;z-index: 9999;display:none;position: absolute;background-color:#333;width: 100px;">
                            <li id="strategyEdit">编辑策略</li>
                            <li id="delOtherStrategy">删除其他</li>
                            <li id="delAllStrategy">删除所有</li>
                        </ul>`)
            }

            //设定默认值
            for (var i = 0; i < findInstance.data.length; i++) {
                var item = findInstance.data[i];
                item.edit = item.edit || "text";
            }
            //字段 下拉框html
            var optionConditionField = '',
                items = findInstance.data;
            for (var i = 0; i < items.length; i++) {
                if (items[i].show != "false") {
                    optionConditionField += `<option value="${items[i].field}">${items[i].title}</option>`;
                }
            }
            findInstance.conditionFieldHtml = `<select name="conditionField" lay-filter="conditionField">${optionConditionField}</select>`;

            //操作 下拉框html
            findInstance.conditionOptionHtml =
                `<select name="conditionOption" lay-filter="conditionOption">
                            <option value='equal'>等于</option>
                            <option value='like'>包含</option>
                            <option value='between'>范围</option>
                            <option value='start'>开头字符</option>
                            <option value='end'>结尾字符</option>
                            <option value='unequal'>不等于</option>
                            <option value='empty'>为空</option>
                        </select>`;
            //缓存实例
            this.cacheInstance[config.instanceName] = findInstance;
            return findInstance;
        }
    };

    // 创建实例  根据用户传递的参数初始化查询条件弹出框
    var createFindInstance = function (_config) {
        var findInstance = {
            data: [], // 存放用户传进的查询条件参数：fields
            config: _config,
            layerBoxId: (Math.random() + "").substr(2), //随机弹出层id
            strategyData: {}, // 存放用户制定的查询策略   各条件之间暂定为 并集 查询，即需同时满足所有条件
            activatedStrategyData: {} // 已激活的策略项
        };

        // 删除查询策略
        $(findInstance.config.strategyId).on('click', 'a.delStrategy', function (e) {
            delete findInstance.strategyData[$(this).parent().attr('data-sname')]
            delete findInstance.activatedStrategyData[$(this).parent().attr('data-sname')]
            $(this).parent().remove();
            findInstance.tableReload(true)
            if (findInstance.config.delStrategy) {
                findInstance.config.delStrategy(findInstance.strategyData, findInstance.activatedStrategyData);
            }
            return false;
        })

        // 策略切换 回调
        $(findInstance.config.strategyId).find('span').off('click')
        $(findInstance.config.strategyId).on('click', 'span', function () {
            if ($(this).hasClass('selected')) {
                $(this).removeClass('selected').css('background-color', '#1E9FFF');
                delete findInstance.activatedStrategyData[$(this).attr('data-sname')]
            } else {
                $(this).addClass('selected').css('background-color', '#ffb800');
                findInstance.activatedStrategyData[$(this).attr('data-sname')] = findInstance.strategyData[$(this).attr('data-sname')]
            }
            findInstance.tableReload(true)
            if (findInstance.config.strategyClick) {
                findInstance.config.strategyClick($(this), findInstance.strategyData, findInstance.activatedStrategyData);
            }
            return false
        })

        // 策略右键点击  出现下拉菜单  删除全部，其他   编辑 回调
        $(findInstance.config.strategyId).on('contextmenu', 'span', function (ev) {
            var ev = ev || window.event,
                l = ev.offsetX,
                pl = $(this)[0].offsetLeft;
            $("#strategyOperation").attr('data-sname', $(this).attr('data-sname'))

            $("#strategyOperation").show().css({
                'left': l + pl + 'px',
                'top': $(this).parent().height() + 'px'
            });
            return false;
        });

        document.onclick = function () {
            $("#strategyOperation").hide()
        }

        // 编辑策略
        $(findInstance.config.strategyId).on('click', '#strategyEdit', function () {
            var name = $(this).parent().attr('data-sname')
            findInstance.open(name);
        })

        // 删除所有
        $(findInstance.config.strategyId).on('click', '#delAllStrategy', function () {
            $(findInstance.config.strategyId).find('span').remove();
            findInstance.strategyData = {}
            findInstance.activatedStrategyData = {}
            findInstance.tableReload(true)
            if (findInstance.config.delAll) {
                findInstance.config.delAll();
            }
        })

        // 删除其他
        $(findInstance.config.strategyId).on('click', '#delOtherStrategy', function () {
            $(findInstance.config.strategyId).find('span[data-sname!="' + $(this).parent().attr('data-sname') + '"]').remove();
            findInstance.strategyData = findInstance.strategyData[$(this).parent().attr('data-sname')]
            if ($(findInstance.config.strategyId).find('span[data-sname="' + $(this).parent().attr('data-sname') + '"]').hasClass('selected')) {
                findInstance.activatedStrategyData = findInstance.strategyData
            } else {
                findInstance.activatedStrategyData = {}
            }
            findInstance.tableReload(true)
            if (findInstance.config.delOther) {
                findInstance.config.delOther($(findInstance.config.strategyId).find('span[data-sname="' + $(this).parent().attr('data-sname') + '"]'), findInstance.strategyData, findInstance.activatedStrategyData);
            }
        })

        // 根据 cacheInstance 缓存的实例 设置策略
        // findInstance.setConditionByCache = function (obj) {
        //     var cache = dynamicCondition.cacheInstance
        //     $(findInstance.config.strategyId).html('')
        //     var allStrategy = obj.activatedStrategyData ? obj.activatedStrategyData : obj;
        //     for (const k in allStrategy) {
        //         const strategy = allStrategy[k];
        //         var title = findInstance.buildStrategyTitle(k);
        //         $(findInstance.config.strategyId).append(`
        //          <span data-sname="${k}" title="${title}" style="border-radius: 6px;display: inline-block;text-align: center;height: 25px;line-height: 25px;background-color: #1e9fff;color: #fff;padding: 0px 5px;">
        //             ${k}
        //             <a href="javascript:void(0);" style="padding-left: 4px;color: #fff;" class="delStrategy">
        //                 <i class="layui-icon layui-icon-close" style="font-size: 12px;font-weight: bold;cursor: pointer;" title="删除此策略"></i>
        //             </a>
        //         </span>`)
        //     }
        // }

        // 根据查询条件的 field 获取对应的整段内容
        findInstance.getObjByField = function (field) {
            for (let i = 0; i < findInstance.data.length; i++) {
                const element = findInstance.data[i];
                if (element.field == field) {
                    return element;
                }
            }
            return null;
        }

        // 增加条件
        findInstance.addCondition = function () {
            var layerBox = $('#' + findInstance.layerBoxId);
            layerBox.find('div.newAdd').removeClass('newAdd');
            layerBox.find('div.conditionDiv').append(`
                            <div class="conditionRow layui-anim layui-anim-up newAdd" style="display: flex;">
                                <div class="layui-inline conditionField" style="flex:3;">${findInstance.conditionFieldHtml}</div>
                                <div class="layui-inline conditionOption" style="flex:3;">${findInstance.conditionOptionHtml}</div>
                                <div class="layui-inline conditionValue" style="flex:7;display: flex;"></div>
                                <div class="layui-inline conditionDel" style="text-align: center;width:38px;height: 38px;line-height: 38px;">
                                    <a href="javascript:void(0);" class="delRowBtn">
                                        <i class="layui-icon layui-icon-close" style="font-size: 30px; color: red;"></i>
                                    </a>
                                </div>
                            </div>`);
            findInstance.updateConditionValue(layerBox.find('div.newAdd'));

            form.render('select', 'conditionDiv');
            layerBox.find('div.conditionValue').children('div').css('flex', 1)
            return layerBox.find('div.newAdd');
        }

        // 初始化查询条件表格
        findInstance.updateConditionValue = function (newCondition) {
            // 获取条件各项值
            var fieldVal = newCondition.find("select[name='conditionField']").val(),
                optionVal = newCondition.find("select[name='conditionOption']").val(),
                valueVal = newCondition.find('div.conditionValue'),
                obj = findInstance.getObjByField(fieldVal);
            //没有对应的obj，则不用更新conditionValue
            if (!obj) {
                return;
            }

            // 给 valueVal 附上对应属性
            valueVal.attr({
                'field': obj.field,
                'edit': obj.edit,
                'optionVal': optionVal
            });

            var layVerify = obj.layVerify ? obj.layVerify : '';

            if (optionVal == "empty") {
                valueVal.html("");
                return;
            }

            // 判断类型，更新对应视图
            if (obj.edit == 'text') { // 文本类型
                if (optionVal == 'between') { // 范围
                    valueVal.html(`
                            <input 
                                type="text" 
                                name="conditionValueLeft" 
                                lay-verify="${layVerify}" 
                                class="layui-input" 
                                style="display:inline" 
                                placeholder="" />
                            <span style='margin:auto 3px;'>至</span>
                            <input 
                                type="text" 
                                name="conditionValueRight" 
                                lay-verify="${layVerify}" 
                                class="layui-input" 
                                style="display:inline" 
                                placeholder="" />`)
                } else {
                    valueVal.html(`<input 
                                            type="text" 
                                            lay-verify="${layVerify}" 
                                            name="conditionValue" 
                                            class="layui-input" 
                                            placeholder="" />`)
                }
            } else if (obj.edit == 'select') {
                var selectHtml = $(obj.templet).is("select") ? $(obj.templet).prop("outerHTML") : $(obj.templet).html();
                if (optionVal == 'between') {
                    valueVal.html(`
                            <div style='display:inline-block'>
                                ${selectHtml}
                            </div>
                            <span style='margin:auto 3px;'>至</span>
                            <div style='display:inline-block'>
                                ${selectHtml}
                            </div>`);

                    valueVal.find('div:first-child select').attr("name", "conditionValueLeft")
                    valueVal.find('div:last-child select').attr("name", "conditionValueRight")

                    if (layVerify) {
                        valueVal.find('div:first-child select').attr("lay-verify", layVerify);
                        valueVal.find('div:last-child select').attr("lay-verify", layVerify);
                    }
                } else {
                    var selectJq = null;
                    selectJq = $(selectHtml);
                    selectJq.attr("name", "conditionValue");
                    valueVal.html("");
                    valueVal.append(selectJq);
                }
                form.render('select', 'conditionDiv');
                valueVal.children('div').css('flex', 1)
            } else if (obj.edit == 'date') {
                var dateType = obj.dateType || "date";
                if (optionVal == 'between') {
                    valueVal.attr('date-type', dateType);
                    valueVal.html(`
                            <input 
                                type="text" 
                                name="conditionValueLeft" 
                                lay-verify="${layVerify}" 
                                date-type="${dateType}" 
                                class="layui-input" 
                                style="display:inline" 
                                placeholder="" />
                            <span style='margin:auto 3px;'>至</span>
                            <input 
                                type="text" 
                                name="conditionValueRight" 
                                lay-verify="${layVerify}" 
                                date-type="${dateType}" 
                                class="layui-input" 
                                style="display:inline" 
                                placeholder="" />`)

                    // 渲染日期控件
                    laydate.render({
                        elem: valueVal.find('input[name="conditionValueLeft"]')[0],
                        type: dateType
                    });
                    laydate.render({
                        elem: valueVal.find('input[name="conditionValueRight"]')[0],
                        type: dateType
                    });
                } else {
                    valueVal.html(`
                            <input 
                                type="text" 
                                name="conditionValue" 
                                lay-verify="${layVerify}" 
                                date-type="${dateType}" 
                                class="layui-input" 
                                style="display:inline" 
                                placeholder="" />`)
                    // 渲染日期控件
                    laydate.render({
                        elem: valueVal.find('input[name="conditionValue"]')[0],
                        type: dateType
                    });
                }
            }
        }

        // 表单校验
        findInstance.verifyForm = function () {
            var verifySuccess = true,
                layerBox = $('#' + findInstance.layerBoxId),
                verify = form.config.verify, // form组件中的验证方法
                DANGER = 'layui-form-danger',
                verifyElem = layerBox.find('*[lay-verify]'); //获取需要校验的元素

            // 校验
            for (let i = 0; i < verifyElem.length; i++) {
                var othis = $(verifyElem[i]),
                    vers = othis.attr('lay-verify').split('|'),
                    verType = othis.attr('lay-verType'), //提示方式
                    option = othis.parents('div.conditionRow').find("select[name='conditionOption']").val(),
                    value = othis.val();
                othis.removeClass(DANGER);
                var errorText, // 报错提醒文字
                    allowBlank = true; //是否允许空值

                layui.each(vers, function (_, thisVer) {
                    if (thisVer.indexOf("required") >= 0) {
                        //不允许为空值
                        allowBlank = false;
                    }
                })

                //允许为空值
                if (allowBlank) {
                    if (value == "") {
                        //校验通过，如果还有其他的pass，number等也不用校验了。
                        continue;
                    }
                }

                //不允许为空值，继续校验
                for (let j = 0; j < vers.length; j++) {
                    var isTrue = null, //是否命中校验
                        thisVer = vers[j], //校验name，如：required，pass 等
                        errorText = '', //错误提示文本
                        isFn = typeof verify[thisVer] === 'function';

                    //匹配验证规则
                    if (verify[thisVer]) {
                        isTrue = isFn ? errorText = verify[thisVer](value, verifyElem[i]) : !verify[thisVer][0].test(value);
                        errorText = errorText || verify[thisVer][1];

                        // 特殊例子
                        // 当验证规则为 'phone' 且 条件选项为 包含
                        if (thisVer == 'phone' && option == 'like') {
                            // /^\d{1,11}$/
                            isTrue = isFn ? errorText = verify[thisVer](value, verifyElem[i]) : !/^\d{1,11}$/.test(value);
                            errorText = '请输入小于或等于11位的数字'
                        }

                        // 当验证规则为 'email' 且 条件选项为 包含
                        if (thisVer == 'email' && option == 'like') {
                            // /^\d{1,11}$/
                            isTrue = false;
                        }

                        //isTrue为true，则验证不通过
                        if (isTrue) {
                            verifySuccess = false;
                            //提示
                            layer.tips(errorText, function () {
                                if (typeof othis.attr('lay-ignore') !== 'string') {
                                    if (verifyElem[i].tagName.toLowerCase() === 'select' || /^checkbox|radio$/.test(verifyElem[i].type)) {
                                        return othis.next();
                                    }
                                }
                                return othis;
                            }(), {
                                tips: [1, '#FF0000']
                            });
                            othis.addClass(DANGER);
                            return verifySuccess;
                        }
                    }
                }
            }
            return verifySuccess;
        }

        // 将所有新增条件合成一个查询策略  放入 strategyData 中
        findInstance.buildCacheConditionStrategy = function (name, oldStrategyName) {
            var layerBox = $("#" + findInstance.layerBoxId),
                conditionRows = layerBox.find('div.conditionRow'),
                cacheAllConditions = [];

            for (let i = 0; i < conditionRows.length; i++) {
                var rowItem = $(conditionRows[i]),
                    edit = rowItem.find('div.conditionValue').attr('edit'),
                    conditionValueText = '',
                    conditionValueLeftText = '',
                    conditionValueRightText = '';

                if (edit == 'select') {
                    conditionValueText = rowItem.find("[name='conditionValue'] option:selected").html();
                    conditionValueLeftText = rowItem.find("[name='conditionValueLeft'] option:selected").html();
                    conditionValueRightText = rowItem.find("[name='conditionValueRight'] option:selected").html();
                } else {
                    conditionValueText = rowItem.find("[name='conditionValue']").val();
                    conditionValueLeftText = rowItem.find("[name='conditionValueLeft']").val();
                    conditionValueRightText = rowItem.find("[name='conditionValueRight']").val();
                }

                var conditionObj = {
                        'conditionFieldVal': rowItem.find("select[name='conditionField']").val(),
                        'conditionFieldText': rowItem.find("select[name='conditionField'] option:selected").html(),
                        'conditionOptionVal': rowItem.find("select[name='conditionOption']").val(),
                        'conditionOptionText': rowItem.find("select[name='conditionOption'] option:selected").html(),
                        'conditionValueVal': rowItem.find("[name='conditionValue']").val(),
                        'conditionValueText': conditionValueText,
                        'conditionValueLeftVal': rowItem.find("[name='conditionValueLeft']").val(),
                        'conditionValueLeftText': conditionValueLeftText,
                        'conditionValueRightVal': rowItem.find("[name='conditionValueRight']").val(),
                        'conditionValueRightText': conditionValueRightText,
                        'type': edit,
                        'dateType': rowItem.find('div.conditionValue').attr('data-type')
                    },
                    item = findInstance.getObjByField(conditionObj.conditionFieldVal);
                if (item.edit == "select") {
                    conditionObj.conditionValueHtml = rowItem.find(".conditionValue").html();
                }
                cacheAllConditions.push(conditionObj);
            }
            if (name) {
                if (oldStrategyName) {
                    delete findInstance.strategyData[oldStrategyName]
                    delete findInstance.activatedStrategyData[oldStrategyName]
                }
                findInstance.strategyData[name] = cacheAllConditions;
                findInstance.activatedStrategyData[name] = cacheAllConditions;

            }
            return cacheAllConditions;
        }

        // 根据条件生成 策略 title显示文本
        findInstance.buildStrategyTitle = function (name) {
            var conditionArr = findInstance.activatedStrategyData[name],
                strategyTitle = '';
            for (let i = 0; i < conditionArr.length; i++) {
                var item = conditionArr[i];
                if (item.conditionOptionVal == 'between') {
                    strategyTitle += item.conditionFieldText + '  ' +
                        item.conditionOptionText + '  ' +
                        item.conditionValueLeftText + '  ' +
                        "至" + '  ' +
                        item.conditionValueRightText + '\n'
                } else {
                    item.conditionValueText = item.conditionValueText ? item.conditionValueText : ''
                    strategyTitle += item.conditionFieldText + '  ' +
                        item.conditionOptionText + '  ' +
                        item.conditionValueText + '\n'
                }
            }
            return strategyTitle;
        }

        // 获取数据，渲染目标表格
        findInstance.tableReload = function (flag) {
            var viewBox = $('#' + findInstance.config.tableId).next('div.layui-table-view');
            // 此功能为查询后 表格重载
            // 目标表格需依赖layui.table模块
            // 搜寻的目标表格需用 table.render 渲染
            var conditionData = null;
            if (flag) {
                conditionData = findInstance.activatedStrategyData // 所有激活的策略
            } else {
                conditionData = {
                    'search': findInstance.buildCacheConditionStrategy() // 实时查询 获取当前所选条件
                }
            }
            var totalCounts =viewBox.find('div.layui-table-page').find('span.layui-laypage-count').html()
            if (findInstance.config.url && '') {
                // 此时参数为 url 地址  需向后台请求数据
                table.reload(findInstance.config.tableId, {
                    url: findInstance.config.url,
                    where: conditionData, //设定异步数据接口的额外参数
                    page: {
                        curr: 1 //重新从第 1 页开始
                    }
                });
            } else {
                var tableBox = viewBox.find('div.layui-table-main'),
                    trItems = tableBox.find('tr');
                trItems.show();
                tableBox.find('.noData').remove();
                viewBox.find('div.layui-table-page').show();
                for (let i = 0; i < trItems.length; i++) {
                    var trItem = trItems[i];
                    var flag = false;
                    for (const j in conditionData) {
                        var conditionItems = conditionData[j];
                        for (const k in conditionItems) {
                            var conditionItem = conditionItems[k],
                                tagetVal = '';
                            if (conditionItem.conditionFieldVal == 'checkbox') {
                                tagetVal = $(trItem).find('input').prop('checked') ? '已选中' : '未选中'
                            } else {
                                tagetVal = $(trItem).find('td[data-field="' + conditionItem['conditionFieldVal'] + '"] div').html();
                            }

                            switch (conditionItem.conditionOptionVal) {
                                case 'equal':
                                    // 等于
                                    if (tagetVal != conditionItem['conditionValueText']) {
                                        $(trItem).hide()
                                        flag = true
                                    }
                                    break;
                                case 'like':
                                    // 包含
                                    if (!tagetVal.includes(conditionItem['conditionValueText'])) {
                                        $(trItem).hide()
                                        flag = true
                                    }
                                    break;
                                case 'between':
                                    // 范围
                                    if (conditionItem.type == 'date') {
                                        var targetTime = Date.parse(tagetVal),
                                            minTime = Date.parse(conditionItem['conditionValueLeftText']),
                                            maxTime = Date.parse(conditionItem['conditionValueRightText']);
                                        if (targetTime < minTime || targetTime > maxTime) {
                                            $(trItem).hide()
                                            flag = true
                                        }
                                    } else {
                                        if (tagetVal < conditionItem['conditionValueLeftText'] ||
                                            tagetVal > conditionItem['conditionValueRightText']) {
                                            $(trItem).hide()
                                            flag = true
                                        }
                                    }
                                    break;
                                case 'start':
                                    // 开头字符
                                    if (!tagetVal.startsWith(conditionItem['conditionValueText'])) {
                                        $(trItem).hide()
                                        flag = true
                                    }
                                    break;
                                case 'end':
                                    // 结尾字符
                                    if (!tagetVal.endsWith(conditionItem['conditionValueText'])) {
                                        $(trItem).hide()
                                        flag = true
                                    }
                                    break;
                                case 'unequal':
                                    // 不等于
                                    if (tagetVal == conditionItem['conditionValueText']) {
                                        $(trItem).hide()
                                        flag = true
                                    }
                                    break;
                                case 'empty':
                                    // 为空
                                    if (tagetVal != '') {
                                        $(trItem).hide()
                                        flag = true
                                    }
                                    break;
                            }
                            if (flag) {
                                break
                            }
                        }
                        if (flag) {
                            break
                        }
                    }
                }
                if (tableBox.find('tr:visible').length == 0) {
                    tableBox.append('<div class="layui-none noData">无数据</div>');
                    viewBox.find('div.layui-table-page').hide();
                }
            }
        }

        // 打开窗口，渲染
        findInstance.open = function (oldStrategyName) {
            var titleStr = oldStrategyName ? ` - 编辑` : '';
            // 弹窗
            findInstance.openPageIndex = layer.open({
                type: 1,
                id: 'dynamicConditionLayer', //防止重复弹出
                offset: '50px',
                title: "高级查询" + titleStr,
                area: ['610px', '400px'], //宽高
                btn: ['查询', '重置', '取消'],
                content: `<div id="${findInstance.layerBoxId}" class="conditionContainer" lay-filter="conditionContainer" style="min-width: 525px;">
                                    <div style="height: 25px;margin: 5px 10px 0;padding: 0 10px 3px;">
                                        <div style="float:left;margin-top: 2px;"><span style="color:red;">*</span>查询条件</div>
                                        <a href="javascript:void(0);" title="增加条件" style="margin-left:10px;float:left;" class="addRowBtn">
                                            <i class="layui-icon layui-icon-add-circle-fine" style="font-size: 20px; color: &#xe608;"></i> 
                                        </a> 
                                        <div class="layui-form" lay-filter="saveStrategyBox" style="float:right;">
                                            <!-- <input type="checkbox" name="" id="saveAsStrategy" style="vertical-align: sub;">
                                            <label id="" class="" for="saveAsStrategy">保存为查询策略</label> -->
                                            <input type="checkbox" name="saveStrategyInput" title="保存为查询策略" lay-skin="primary">
                                            <input type="text" id="strategyName" maxlength="10" autofocus placeholder="请输入策略名称，最多10个字符" style="display:none;border: 1px solid #e6e6e6;font-size: 12px;padding: 0 5px;width: 200px;height: 25px;border-radius: 2px;">
                                        </div>
                                    </div>
                                    <div class="conditionDiv layui-form" lay-filter="conditionDiv" style="height:272px;overflow: auto;margin: 0 10px 5px;padding: 0 10px;">
                                        <div class="conditionRow" style="display: flex;">
                                            <div class="layui-inline conditionField" style="flex:3;">${findInstance.conditionFieldHtml}</div>
                                            <div class="layui-inline conditionOption" style="flex:3;">${findInstance.conditionOptionHtml}</div>
                                            <div class="layui-inline conditionValue" style="flex:7;display: flex;"></div>
                                        </div>
                                    </div>
                                </div>`,
                success: function (layero, index) {
                    form.render(null, 'saveStrategyBox')
                    var layerBox = $("#" + findInstance.layerBoxId);
                    if (oldStrategyName) {
                        layero.find('div.conditionRow').remove();
                        findInstance.render(oldStrategyName);
                    } else {
                        findInstance.render();
                        findInstance.updateConditionValue(layerBox.find('div.conditionRow'));
                    }

                    layerBox.parent().css('overflow', 'auto hidden');

                    // 新增条件
                    layero.on('click', 'a.addRowBtn', function () {
                        if (layero.find('div.conditionRow:first-child').find('div.conditionDel').length == 0) {
                            layero.find('div.conditionRow:first-child').append(`
                                        <div class="layui-inline conditionDel" style="text-align: center;width:38px;height: 38px;line-height: 38px;">
                                            <a href="javascript:void(0);" class="delRowBtn">
                                                <i class="layui-icon layui-icon-close" style="font-size: 30px; color: red;"></i>
                                            </a>
                                        </div>`);
                        }
                        findInstance.addCondition();
                    })

                    // 删除条件
                    layero.on('click', '.delRowBtn', function () {
                        $(this).parent().parent().addClass('layui-anim layui-anim-fadeout')
                        $(this).parent().parent().remove();
                        if (layero.find('div.conditionRow').length == 1) {
                            layero.find('div.conditionRow:first-child').find('div.conditionDel').remove();
                        }
                    });

                    // 保存为 查询策略时 需输入策略名称
                    layero.on('click', 'div[lay-filter="saveStrategyBox"] div.layui-unselect.layui-form-checkbox', function () {
                        if ($(this).siblings('input[name="saveStrategyInput"]').is(':checked')) {
                            $(this).siblings('#strategyName').show()
                        } else {
                            $(this).siblings('#strategyName').hide()
                        }
                    })

                    //监听事件
                    form.on('select(conditionField)', function (data) {
                        var conditionRowJq = $(data.elem).parents(".conditionRow");
                        findInstance.updateConditionValue(conditionRowJq);
                    });
                    form.on('select(conditionOption)', function (data) {
                        var conditionRowJq = $(data.elem).parents(".conditionRow");
                        findInstance.updateConditionValue(conditionRowJq);
                    });
                },
                resizing: function (layero) {
                    layero.find('div.conditionDiv').height(layero.find('div.layui-layer-content').height() - 27)
                },
                yes: function (index, layero) {
                    if (findInstance.verifyForm()) { // 校验通过
                        // 保存为 查询策略
                        if (layero.find('input[name="saveStrategyInput"]').is(':checked')) {
                            // 新建或修改的策略名称
                            var strategyName = layero.find('#strategyName').val(),
                                title = '';
                            if (strategyName != '' && strategyName.replace(/\s+/g, "") != '') {

                                // 判断 strategyName 是否有重复
                                if (!oldStrategyName || oldStrategyName != strategyName) {
                                    for (const key in findInstance.strategyData) {
                                        if (key == strategyName) {
                                            layer.msg('查询策略名称已存在，请更换！');
                                            return
                                        }
                                    }
                                }

                                // 将新建的查询策略 展示到指定的 dom 中 或修改目标策略
                                if (oldStrategyName) {
                                    // 编辑模式
                                    findInstance.buildCacheConditionStrategy(strategyName, oldStrategyName);
                                    title = findInstance.buildStrategyTitle(strategyName)
                                    $(findInstance.config.strategyId).find('span[data-sname="' + oldStrategyName + '"]')
                                        .html(strategyName + ` <a href="javascript:void(0);" style="padding-left: 4px;color: #fff;" class="delStrategy">
                                                    <i class="layui-icon layui-icon-close" style="font-size: 12px;font-weight: bold;cursor: pointer;" title="删除此策略"></i>
                                                </a>`).attr({
                                            'data-sname': strategyName,
                                            'title': title
                                        });
                                } else {
                                    findInstance.activatedStrategyData = {}
                                    findInstance.buildCacheConditionStrategy(strategyName);
                                    title = findInstance.buildStrategyTitle(strategyName)
                                    $(findInstance.config.strategyId).find('span.selected').removeClass('selected').css('background-color', '#1E9FFF');
                                    $(findInstance.config.strategyId).append(`
                                        <span data-sname="${strategyName}" title="${title}" class="selected" style="border-radius: 6px;display: inline-block;text-align: center;height: 25px;line-height: 25px;background-color: #ffb800;color: #fff;padding: 0px 5px;">
                                            ${strategyName}
                                            <a href="javascript:void(0);" style="padding-left: 4px;color: #fff;" class="delStrategy">
                                                <i class="layui-icon layui-icon-close" style="font-size: 12px;font-weight: bold;cursor: pointer;" title="删除此策略"></i>
                                            </a>
                                        </span>`)
                                }
                            } else {
                                layer.msg('查询策略名称不能为空！')
                                return
                            }

                            findInstance.tableReload(true)
                        } else {
                            if (oldStrategyName) { // 编辑状态下 取消策略 删除缓存中和展示区对应项
                                delete findInstance.strategyData[$('#strategyOperation').attr('data-sname')]
                                $(findInstance.config.strategyId).find('span[data-sname="' + $('#strategyOperation').attr('data-sname') + '"]').remove();
                                findInstance.tableReload(true)
                            } else {
                                findInstance.tableReload(false)
                            }
                        }
                        if (findInstance.config.queryCallBack) {
                            findInstance.config.queryCallBack(findInstance.strategyData, findInstance.activatedStrategyData);
                        }
                        layer.close(index)
                    }
                },
                btn2: function (index, layero) { // 重置
                    layero.find('div.conditionDiv').html(`
                            <div class="conditionRow" style="display: flex;">
                                <div class="layui-inline conditionField" style="flex:3;">${findInstance.conditionFieldHtml}</div>
                                <div class="layui-inline conditionOption" style="flex:3;">${findInstance.conditionOptionHtml}</div>
                                <div class="layui-inline conditionValue" style="flex:7;display: flex;"></div>
                            </div>`);
                    findInstance.updateConditionValue(layero.find('div.conditionRow'));
                    form.render('select', 'conditionDiv');
                    layero.find('div.conditionValue').children('div').css('flex', 1)
                    layero.find('#saveAsStrategy').prop("checked", false);
                    layero.find('#strategyName').hide();

                    return false
                }
            });
        }

        // 渲染弹窗界面
        findInstance.render = function (key) {
            var cacheCondition = key ? findInstance.strategyData[key] : [];
            for (var i = 0; i < cacheCondition.length; i++) {
                var conditionObj = cacheCondition[i];
                var conditionRowJq = findInstance.addCondition();
                conditionRowJq.find("select[name='conditionField']").val(conditionObj.conditionFieldVal);
                conditionRowJq.find("select[name='conditionOption']").val(conditionObj.conditionOptionVal);
                findInstance.updateConditionValue(conditionRowJq);
                if (conditionRowJq.find("[name='conditionValue']").length > 0) {
                    conditionRowJq.find("[name='conditionValue']").val(conditionObj.conditionValueVal);
                }
                if (conditionRowJq.find("[name='conditionValueLeft']").length > 0) {
                    conditionRowJq.find("[name='conditionValueLeft']").val(conditionObj.conditionValueLeftVal);
                }
                if (conditionRowJq.find("[name='conditionValueRight']").length > 0) {
                    conditionRowJq.find("[name='conditionValueRight']").val(conditionObj.conditionValueRightVal);
                }
            }
            form.render(null, 'conditionDiv');
            if (key) {
                var layerBox = $('#' + findInstance.layerBoxId)
                if (layerBox.find('div.conditionRow').length == 1) {
                    layerBox.find('div.conditionDel').remove();
                }
                layerBox.find('#saveAsStrategy').prop("checked", true);
                layerBox.find('#strategyName').val(key).show();
            }

        }
        return findInstance;
    }
    exports(MOD_NAME, dynamicCondition);
})