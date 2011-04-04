
var log = function() {console.log.apply(console, arguments);};

function create(i, add){
    var e = "";
    add = add || "";
    while(i--)
        e += "<input type='input' class='_"+i+"' "+add+" />";
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
    
    elems.first().val(1).trigger("change");
    
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

module("Unbind");

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

test("Removing elements", function(){
    
    var elems = create(4);
    var target = create(1, "data-is_target='true'");

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

module("Multiple");

test("Is bound", function(){
    
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
