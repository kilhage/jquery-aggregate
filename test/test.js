
var log = function() {console.log.apply(console, arguments);};

function create(i){
    var e = "";
    while(i--)
        e += "<input type='input' />";
    return $(e);
}

module("Event");

$.each(["change", "keyup"], function(i, event_name) {
    
    test(event_name, function() {
        
        expect(6);

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

        trigger = false;

        elems.first().val("1").trigger(event_name);

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

