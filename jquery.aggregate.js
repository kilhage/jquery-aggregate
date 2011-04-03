/**
 *
 * @author Emil Kilhage 
 */

(function($, window) {

var EVENT_NAME = "aggregate";
var DATA_NAME = "aggregatorHandler";
var TARGET = "target";
var SOURCE = "source";

var element_types = [TARGET, SOURCE];

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
    
    var aggregator = new $.aggregator(this, options);
    
    return aggregator;
};

$.aggregator = function(source, options) {
    if ( ! $.aggregator.isAggregator(this) )
        return new $.aggregator(source, options);
    
    this.source = $(source);
    this.options = $.aggregator.parseOptions(options);
    this.target = $(options.target);
    delete options.target;
    this.updateAttrs().bind();
    
    if ( this.options.start_by_aggregate === true )
        this.aggregate();
    else
        this.value = this.getAggregatedValue();
};

$.extend($.aggregator, {
    
    DATA_NAME: DATA_NAME,
    EVENT_NAME: EVENT_NAME,
    SOURCE: SOURCE,
    TARGET: TARGET,
    
    prototype: {
        
        event_name: EVENT_NAME,
        
        updateAttrs: function(){
            return this.updateTargetAttrs().updateSourceAttrs();
        },
        
        bind: function() {
            return this._bindSource(this.source)._bind(this.target, true);
        },
        
        _bind: function(elem, is_target) {
            var data = {
                aggregator: this,
                type: (is_target ? $.aggregator.TARGET : $.aggregator.SOURCE)
            };
            
            elem.bind(this.event_name, data, event_aggregate_callback);
            
            return this;
        },
        
        _bindSource: function(elem) {
            elem.bind(this.options.onEvent, event_aggregate_callback);
            this._bind(elem);
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
        
        remove: function(elem) {
            var self = this;
            elem = $(elem);
            var _elem = elem[0];
            
            this.source = this.source.filter(function() {
                var is = this == _elem;
                
                if ( is )
                    self.removeFromHandler(this);
                
                return ! is;
            });
            
            return this._unbind(elem).updateAttrs();
        },
        
        destroy: function() {
            var self = this;
            
            $.each(element_types, function(i, type) {
                self[type] = self[type].filter(function(i, elem) {
                    self.removeFromHandler(this, type);
                    return false;
                });
            });
            
            return this;
        },
        
        removeFromHandler: function(elem, type){
            var handler = $.aggregator.get(elem);
            
            if ( ! $.aggregator.isHandler(handler) )
                $.error("$.aggregator::removeFromHandler: element is not bound to a aggregator-handler");
            
            handler.remove(this, type);
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
                
            this.value = value;
                
            this.target.each(function(i, elem) {
                elem[self.target_attrs[i]] = value;
                
            }).trigger(this.event_name, [this]).trigger("change");
            
            return this;
        },
        
        getAggregatedValue: function() {
            var self = this;
            
            var parsed_values = [];
            this.source.each(function(i, elem) {
                var value = self.options.parser(elem[self.source_attrs[i]]);
                
                if ( self.options.fix_NaN === true && isNaN(value) ) 
                    value = self.options.value_if_NaN;
                
                parsed_values.push(value);
            });
            
            var value = this.options.method.call(parsed_values);
            
            if ( typeof this.options.fix_value == "function" )
                value = this.options.fix_value.call(this, value);
            
            return value;
        }
        
    },
    
    options: {
        onEvent: "change keyup",
        method: "sum",
        parser: "int",
        fix_NaN: true,
        value_if_NaN: 0,
        start_by_aggregate: true
        
        /* available options
        id: "",
        fix_value: function(value) {
            // this === the instance of $.aggregator
            return value;
        }
        */
    },
    
    isAggregator: function(elem) {
        return elem instanceof $.aggregator;
    },
    
    isHandler: function(elem) {
        return elem instanceof $.aggregator.handler;
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
        return $(elem).data(DATA_NAME);
    },
    
    parseOptions: function(options) {
        var _options = {};
        options = $.extend(true, _options, $.aggregator.options, options);

        $.each(option_maps, function(option, object) {
            _options[option] = getOption(_options, option, object);
        });
        
        return _options;
    }
    
});

$.each(["Target", "Source"], function(i, name) {

    var name_lower = name.toLowerCase();
    var method_name = "add"+name;
    var update_method = "update"+name+"Attrs";
    var attrs_key = name_lower+"_attrs";
    
    $.aggregator.prototype[method_name] = function(elem) {
        var elems = this[name_lower];
        
        elem = $(elem);
        
        elem.each(function() {
            elems[elems.length++] = this;
        });
        
        if ( name_lower == SOURCE ) {
            this._bindSource(elem);
        } else {
            this._bind(elem, true);
        }
        
        return this[update_method]();
    };
    
    $.aggregator.prototype[update_method] = function() {
        var self = this;
        this[attrs_key] = [];

        this[name_lower].each(function(i, elem) {
            self[attrs_key][i] = getContentAttr(elem);
        });

        return this;
    };
    
});

$.aggregator.prototype.add = $.aggregator.prototype.addSource;

$.aggregator.handler = function(element) {
    this.element = element;
    this.source = [];
    this.target = [];
};

$.aggregator.handler.prototype = {
    
    add: function(aggregator, type) {
        var aggregators = this[type];
        
        if ( ! aggregators ) 
            $.error("invalid type: "+type);
        
        if ( $.inArray(aggregator, aggregators) == -1 )
            aggregators.push(aggregator);
        
        return this;
    },
    
    remove: function(aggregator, type) {
        var self = this;
        
        $.each(type ? [type] : element_types, function(_, type) {
            var aggregators = self[type], i = 0, l = aggregators.length;
            
            if ( ! aggregators ) 
                $.error("invalid type: "+type);
            
            for (; i < l ; i++ ) {
                if ( aggregators[i] === aggregator ) {
                    delete aggregators[aggregators.length--];
                }
            }
        });
        
        return this;
    },
    
    destroy: function() {
        return this._callAggregatorMethod("remove", [this.element]);
    },

    aggregate: function() {
        return this._callAggregatorMethod("aggregate");
    },
    
    _callAggregatorMethod: function(name, args) {
        var i = this.source.length, aggregator;
        
        args = args || [];
        
        while(i--) {
            aggregator = this.source[i];
            if ( aggregator ) {
                aggregator[name].apply(aggregator, args);
            }
                
        }
        
        return this;
    }
    
};

$.event.special[EVENT_NAME] = {
    
    setup: function(data) {
        var handler = $.data(this, DATA_NAME, new $.aggregator.handler(this));
        if ( typeof data === "object" && $.aggregator.isAggregator(data.aggregator) ) {
            handler.add(data.aggregator, data.type);
        }
        
    },
    
    teardown: function() {
        var handler = $.aggregator.get(this);
        if ( ! $.aggregator.isHandler(handler) ) return;
        handler.destroy();
        $.removeData(this, DATA_NAME);
    }
    
};

function isNaN(num) {
    return num != num;
}

function getOption(options, key, from) {
    var type = typeof options[key], option;

    if ( type == "function" ) 
        return options[key];

    else if ( type == "string" ) 
        option = from[options[key]];
    
    if ( ! option ) 
        $.error("$.aggregator:: Unable to find option "+key);

    return option;
}

function validLength(elems) {
    return elems.length > 0;
}

function getContentAttr(elem) {
    return elem ? ($(elem).is("input,textarea") ? "value" : "innerHTML") : null;
}

var event_aggregate_callback = function() {
    var handler = $.aggregator.get(this);
    
    if ( ! $.aggregator.isHandler(handler)  )
        $.error("$.aggregator:: Unable to aggregate elements without an $.aggregator.handler...");
    
    handler.aggregate();
};

var parsers = {
    "int": window.parseInt,
    "float": window.parseFloat
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
    }
};

var option_maps = {
    parser: parsers, 
    method: aggregate_methods
};

}(jQuery, window));
