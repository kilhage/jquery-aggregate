/**
 *
 * @author Emil Kilhage 
 */

(function($, window) {

var EVENT_NAME = "aggregate";
var DATA_NAME = "aggregator";

$.fn.aggregate = function(target, parser, method) {
    var options = {};
    
    if ( ! validLength(this) ) return this;
    
    if ( target && (typeof target == "string" || target.nodeType || target.jquery) ) {
        options.target = target;
        
        if ( parser )
            options.parser = parser;

        if ( method )
            options.method = method;
    }
    else options = target;
    

    $.aggregator(this, options);
    
    return this;
};

$.aggregator = function(elems, options) {
    if ( ! $.aggregator.isAggregator(this) )
        return new $.aggregator(elems, options);
    
    this.source = elems;
    
    this.parsed_values = [];
    this.target_attrs  = [];
    
    this.updateSourceAttrs()
            
    options = $.extend(true, this.options = {}, $.aggregator.options, options);

    $.each({
        parser: parsers, 
        method: aggregate_methods
    }, function(option, object) {
        options[option] = getOption(options, option, object);
    });

    if ( typeof options.id == "string" )
        this.event_name += "."+options.id;

    this.target = $(options.target);

    if ( ! this.target[0] )
        $.error("$.aggregator:: Cannot locate any target elements");
    
    this.value = this.updateTargetAttrs().bind().getAggregatedValue();
};

$.extend($.aggregator, {
    
    DATA_NAME: DATA_NAME,
    EVENT_NAME: EVENT_NAME,
    
    prototype: {
        
        event_name: EVENT_NAME,
        
        updateAttrs: function(){
            return this.updateTargetAttrs().updateSourceAttrs();
        },
        
        updateTargetAttrs: function() {
            var self = this;
            this.target_attrs = [];
            this.target.each(function(i, elem) {
                self.target_attrs[i] = getContentAttr(elem);
            });
            return this;
        },
        
        updateSourceAttrs: function() {
            var self = this;
            this.source_attrs = [];
            this.source.each(function(i, elem) {
                self.source_attrs[i] = getContentAttr(elem);
            });
            return this;
        },
        
        bind: function() {
            this.source.bind(this.event_name, this, event_aggregate_callback)
                       .bind(this.options.onEvent, event_aggregate_callback);
                       
            this.target.bind(this.event_name, this, event_aggregate_callback);
            
            return this;
        },
        
        unbind: function() {
            this._unbind(this.source, true);
                      
            this.target.unbind(this.event_name, event_aggregate_callback);
            
            return this;
        },
        
        _unbind: function(elem, unbind_all) {
            elem = $(elem);
            elem.unbind(this.options.onEvent, event_aggregate_callback);
            
            if ( unbind_all )
                elem.unbind(this.event_name, event_aggregate_callback);
            
            return this.checkEmpty();
        },
        
        removeElem: function(elem) {
            $.removeData(elem, DATA_NAME);
            this.source = this.source.filter(function() {
                return this != elem;
            });
            
            return this._unbind(elem).updateAttrs();
        },
        
        destroy: function() {
            this.source = this.source.filter(function(i, elem){
                $.removeData(elem, DATA_NAME);
                return false;
            });
            
            this.target = this.target.filter(function(i, elem){
                $.removeData(elem, DATA_NAME);
                return false;
            });
            
            return this;
        },
        
        checkEmpty: function() {
            if ( ! validLength(this.source) ) {
                this.destroy();
            }
            
            return this;
        },
        
        aggregate: function() {
            var self = this, 
                value = this.getAggregatedValue();
            
            if ( this.value != value ) {
                
                this.value = value;
                
                this.target.each(function(i, elem) {
                    elem[self.target_attrs[i]] = value;
                
                }).trigger(this.event_name, [this]).trigger("change");
            }
            
            return this;
        },
        
        getAggregatedValue: function() {
            var self = this;
            
            this.parsed_values = [];
            this.source.each(function(i, elem) {
                var value = self.options.parser(elem[self.source_attrs[i]]);
                
                if ( self.options.fix_NaN === true && isNaN(value) ) 
                    value = self.options.value_if_NaN;
                
                self.parsed_values.push(value);
            });
            
            var value = this.options.method.call(this.parsed_values);
            
            if ( typeof this.options.fix_value == "function" )
                value = this.options.fix_value.call(this, value);
            
            return value;
        }
        
    },
    
    options: {
        onEvent: "change keyup",
        method: "sum",
        parsers: "int",
        fix_NaN: true,
        value_if_NaN: 0
        
        /* available options
        id: "",
        fix_value: function(value) {
            // this === the instance of $.aggregator
            return value;
        }
        */
    },
    
    isAggregator: function(elem){
        return elem instanceof $.aggregator;
    },
    
    addMethod: function(name, fn) {
        if ( !name || $.type(fn) != "function" ) return;
        aggregate_methods[name] = fn;
    },
    
    addParser: function(name, fn) {
        if ( !name || $.type(fn) != "function" ) return;
        parsers[name] = fn;
    },
    
    get: function(elem){
        if ( typeof elem == "string") elem = $(elem);
        return $.data(elem.jquery ? elem[0] : elem, DATA_NAME);
    }
    
});

$.event.special[EVENT_NAME] = {
    
    setup: function(aggregator) {
        if ( ! $.aggregator.isAggregator(aggregator)  )
            $.error("$.aggregator:: Unable to setup element aggregator without an $.aggregator...");
        
        $.data(this, DATA_NAME, aggregator);
    },
    
    teardown: function() {
        var aggregator = $.aggregator.get(this);
        if ( $.aggregator.isAggregator(aggregator) )
            aggregator.removeElem(this);
    }
    
};

function isNaN(num) {
    return num != num;
}

function getOption(options, key, from) {
    var type = $.type(options[key]), option;

    if ( type == "function" ) 
        option = options[key];

    else if ( type == "string" && from[options[key]] ) 
        option = from[options[key]];
    
    else if ( typeof from[from["default"]] == "function" )
        option = from[from["default"]];
    
    else if ( typeof from[from["default"]] == "string" &&
            typeof from[from[from["default"]]] == "function" )
            
        option = from[from[from["default"]]];
    
    else
        $.error("$.aggregator:: Unable to parse option "+key);

    return option;
}

function validLength(elems) {
    return elems.length > 0;
}

function getContentAttr(elem) {
    return $(elem).is("input,textarea") ? "value" : "innerHTML";
}

var event_aggregate_callback = function(event) {
    var aggregator = $.aggregator.get(this);
    
    if ( ! $.aggregator.isAggregator(aggregator)  )
        $.error("$.aggregator:: Unable to aggregate elements without an $.aggregator...");
    
    aggregator.aggregate();
};

var parsers = {
    "int": window.parseInt,
    "float": window.parseFloat,
    string: window.String,
    "default": $.aggregator.options.parser
};

var aggregate_methods = {
    sum: function sum() {
        var v = this[0];
        for( var i = 1, l = this.length; i < l; i++ ) {
            v += this[i];
        }
        return v;
    },
    multiply: function multiply(){
        var v = this[0];
        for( var i = 1, l = this.length; i < l; i++ ) {
            v *= this[i];
        }
        return v;
    },
    divide: function divide(){
        var v = this[0];
        for( var i = 1, l = this.length; i < l; i++ ) {
            v /= this[i];
        }
        return v;
    },
    sub: function sub(){
        var v = this[0];
        for( var i = 1, l = this.length; i < l; i++ ) {
            v -= this[i];
        }
        return v;
    },
    join: Array.prototype.join,
    "default": $.aggregator.options.methods
};

}(jQuery, window));
