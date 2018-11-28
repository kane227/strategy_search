layui.config({
        base: 'lib/extend/' //设定扩展的Layui模块的所在目录，一般用于外部模块扩展
    }).extend({
        dynamicCondition: 'dynamicCondition'
    })
    .use(['table', 'form', 'dynamicCondition'], function() {

        var $ = layui.$,
            table = layui.table,
            form = layui.form,
            dynamicCondition = layui.dynamicCondition;


        var dataFields = [{
            field: "id",
            title: "id",
            edit: "text",
            layVerify: "number"
        }, {
            field: "name",
            title: "姓名",
            edit: "text"
        }, {
            field: "sex",
            title: "性别",
            edit: "select",
            templet: "#selectSex"
        }, {
            field: "birthday",
            title: "出生日期",
            edit: "date"
        }, {
            field: "phone",
            title: "手机号码",
            edit: "text",
            layVerify: "phone"
        }, {
            field: "email",
            title: "邮箱",
            layVerify: "email"
        }];

        var dc = dynamicCondition.create({
            fields: dataFields,
            //通过容器选择器传入，也可以$("#dynamicCondition"),或者document.getElementById("dynamicCondition")
            strategyId: '#strategyBox',
            tableId: "listTable"
        });

        $('.strategySearchBox').on('click', function() {
            dc.open()
        })

        var tableDivHeight = 'full-' + ($("#noTableDiv").height() + 10);
        table.render({
            elem: '#listTable',
            data: data.data,
            height: tableDivHeight,
            cols: [
                [
                    { type: 'radio' },
                    { type: 'checkbox' },
                    { field: 'layui_seq', title: '序号', width: 60, align: 'center' },
                    { field: 'id', title: 'id', width: 60, sort: true },
                    { field: 'name', title: '姓名', sort: true },
                    { field: 'sex', title: '性别', width: 80, sort: true },
                    { field: 'birthday', title: '生日', sort: true },
                    { field: 'phone', title: '手机号码', sort: true },
                    { field: 'email', title: '邮箱', sort: true },
                    { type: 'space' }
                ]
            ],
            page: true,
            limit: 20
        });
    });