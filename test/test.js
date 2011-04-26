
var log = function() {console.log.apply(console, arguments);};
var _i = 0;
function create(i, add){
    var e = "";
    add = add || "";
    while(i--)
        e += "<input type='input' class='_"+i+"' id='"+(_i++)+"' "+add+" />";
    return $(e);
}

module("Event");

$.each(["change", "keyup"], function(i, event_name) {
    
    test(event_name, function() {

        var elems = create(4);
        var target = create(1);
        var trigger = true;

        elems.aggregate({
            target: target,
            method: "sum",
            parser: "int"
        });

        target.bind("change", function() {
            ok(trigger);
        });

        elems.val("1").trigger(event_name);

        equals(target.val(), "4");

        elems.val("3").trigger(event_name);

        equals(target.val(), "12");

        elems.first().val("1").trigger(event_name);

        equals(target.val(), "10");

    });

});

test("aggregator.destroy(); works correctly", function() {
    
    var elems = create(4);
    var target = create(1);
    
    var aggregator = elems.aggregate(target);
    
    elems.val("1").change();
    
    equal(target.val(), "4");
    
    var target_2 = create(1);
    
    elems.aggregate(target_2);
    
    elems.val("2").change();
    
    equal(target.val(), "8");
    equal(target_2.val(), "8");
    
    aggregator.destroy();
    
    elems.val("3").change();
    
    equal(target.val(), "8");
    equal(target_2.val(), "12");
    
});

test("aggregate event", function() {
    
    var elems = create(4);
    var target = create(1);
    
    var i = 0, valid = false;
    
    var action = function(){
        valid = true;
    }
    
    elems.aggregate(target, action);
    
    ok(valid, "elems.aggregate(target, action); works");
    
    valid = false;
    
    elems.aggregate(action);
    
    elems.aggregate();
    
    ok(valid, "elems.aggregate(action); to bind and elems.aggregate(); to trigger works");
    
    valid = false;
    
    elems.bind("aggregate", action);
    
    elems.trigger("aggregate");
    
    ok(valid, 'elems.bind("aggregate", action); and elems.trigger("aggregate"); works');
    
    valid = false;

});

module("Math");

test("Sum", function() {
    
    var number = 4;

    var elems = create(number);
    var target = create(1);

    elems.aggregate({
        target: target,
        method: "sum",
        parser: "int"
    });
    
    elems.val(7).trigger("change");
    
    equals(target.val(), (7*4)+"");
    
});

test("Multiply", function() {

    var elems = create(4);
    var target = create(1);

    elems.aggregate({
        target: target,
        method: "multiply",
        parser: "int"
    });
    
    elems.val(7).trigger("change");
    
    equals(target.val(), (7*7*7*7)+"");
    
    elems.first().val(1).trigger("change");
    
    equals(target.val(), (1*7*7*7)+"");
    
});

test("Divide", function() {

    var elems = create(4);
    var target = create(1);

    elems.aggregate({
        target: target,
        method: "divide",
        parser: "int"
    });
    
    elems.val(7).trigger("change");
    
    equals(target.val(), (7/7/7/7)+"");
    
    elems.first().val("1").trigger("change");
    
    equals(target.val(), (1/7/7/7)+"");
    
});

test("Sub", function() {

    var elems = create(4);
    var target = create(1);

    elems.aggregate({
        target: target,
        method: "sub",
        parser: "int"
    });
    
    elems.val(7).trigger("change");
    
    equals(target.val(), (7-7-7-7)+"");
    
    elems.first().val(1).trigger("change");
    
    equals(target.val(), (1-7-7-7)+"");
    
});

module("Modify aggregators");

test("Adding elements", function(){
    
    var elems = create(4);
    var target = create(1, "data-is_target='true'");

    var aggregator = elems.aggregate(target);
    
    var additional = create(1);
    
    ok($.inArray(additional.get(0), aggregator.source) === -1);
    
    aggregator.add(additional);
    
    ok($.inArray(additional.get(0), aggregator.source) !== -1);
    
    var handler = $.aggregator.get(additional);
    
    if ( !$.aggregator.isHandler(handler) ) {
        ok(false);
        return;
    } else ok(true);
    
    ok($.inArray(aggregator, handler.source) !== -1);
    ok($.inArray(aggregator, handler.target) === -1);
    
    additional.val("1").trigger("change");
    
    equals(target.val(), "1");
    
});

test("Removing elements", function() {
    
    var elems = create(4);
    var target = create(1);

    var aggregator = elems.aggregate(target);
    
    var to_remove = $(elems[2]);
    var handler = $.aggregator.get(to_remove);
    
    ok($.inArray(to_remove.get(0), aggregator.source) !== -1);
    
    ok($.inArray(aggregator, handler.source) !== -1);
    ok($.inArray(aggregator, handler.target) === -1);
    
    aggregator.remove(to_remove);
    
    aggregator.aggregate();
    
    ok($.inArray(to_remove.get(0), aggregator.source) === -1);
    
    ok($.inArray(aggregator, handler.source) === -1);
    ok($.inArray(aggregator, handler.target) === -1);
    
    to_remove.val("1").trigger("change");
    
    equals(target.val(), "0");
    
});

module("Handler");

test("remove", function() {
    
    var elems = create(4);
    var target = create(1);

    var aggregator = elems.aggregate(target);
    var aggregator2 = elems.aggregate(target);
    
    var handler = $.aggregator.get(elems[2]);
    
    ok($.inArray(aggregator, handler.source) != -1);
    
    handler.remove(aggregator);
    
    ok($.inArray(aggregator, handler.source) == -1);
    
});

module("Multiple");

test("Is bound", function() {
    
    var elems = create(4);
    var target = create(4);
    var target2 = create(1);

    var aggregator = elems.aggregate(target);
    
    var aggregator2 = target.aggregate(target2);
    
    elems.val("1").trigger("change");
    
    target.each(function(){
        var handler = $.aggregator.get(this);
        ok($.inArray(aggregator, handler.target) !== -1);
        ok($.inArray(aggregator2, handler.source) !== -1);
    });
    
    equals(target2.val(), "16");
    
});

module("Methods");

test("aggregate", function() {
    
    var elems = create(4);
    var target = create(4);
    
    target.val("0");

    elems.aggregate(target);
    
    elems.val("1");
    
    var ret = elems.aggregate("aggregate");
    
    ok(!!ret.jquery);
    
    equal(target.val(), "4");
    
});

test("get", function() {
    
    var elems = create(4);
    var target = create(4);

    var aggregator = elems.aggregate(target);
    
    var ret = elems.aggregate("get");
    
    ok($.isArray(ret));
    
    ok(ret[0] == aggregator);
    
    equal(ret.length, 1);
    
    ret = elems.aggregate("get", "source");
    
    ok($.isArray(ret));
    
    ok(ret[0] == aggregator);
    
    equal(ret.length, 1);
    
    ret = elems.aggregate("get", "source", 0);
    
    ok(ret == aggregator);
    
    ret = elems.aggregate("get", "target");
    
    equal(ret.length, 0);
    
    equal(elems.aggregate("get", "target", 0), undefined);
    
    
    // Over to the target
    
    ret = target.aggregate("get");
    
    ok($.isArray(ret));
    
    ok(ret[0] == aggregator);
    
    equal(ret.length, 1);
    
    ret = target.aggregate("get", "target");
    
    ok($.isArray(ret));
    
    ok(ret[0] == aggregator);

    equal(ret.length, 1);
    
    ret = target.aggregate("get", "target", 0);
    
    ok(ret == aggregator);
    
    ret = target.aggregate("get", "source");
    
    equal(ret.length, 0);
    
    equal(target.aggregate("get", "source", 0), undefined);
    
});

test("remove", function() {
    
    var elems = create(4);
    var target = create(1);
    
    var valid = false;

    var a = elems.aggregate(target);
    
    elems.val("1").change();
    
    equal(target.val(), "4");
    
    target.change(function() {
        valid = true;
    });
    
    elems.aggregate(function() {
        ok(false);
    });
    
    elems.aggregate("remove");
    
    elems.val("2").change();
    
    equal(target.val(), "4");
    
    equal(target.aggregate().val(), "0");
    
    ok(valid);
    
});

module("Internal");

test("Parsers", function() {
    
    var elems = create(2);
    var target = create(1);

    var a = elems.aggregate({
        target: target,
        parser: "formatedNumber"
    });
    
    elems.val("14.444,55").change();
    
    equal(target.val(), "28.889,1");
    
    elems.val("14444,55").change();
    
    equal(target.val(), "28.889,1");
    
    var elemsS = $(elems[1]).aggregate("remove");
    
    var elemsF = elems.slice(0, 1);
    
    elemsF.val("14.44.4,55").change();
    
    equal(target.val(), "14.444,55");
    
    elemsF.val("14444,55").change();
    
    equal(target.val(), "14.444,55");
    
    a.add(elemsS);
    
    elemsS.val("434.32.432").change();
    
    equal(target.val(), "43.446.876,55");
});
