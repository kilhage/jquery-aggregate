/**
 *
 * @author Emil Kilhage 
 */

plugin("jQuery.aggregate");

module("Internal", 100000);

test("$.observer.get('selector')", function(i) {
    while(i--) {
        $.observer.get('#id');
    }

});
