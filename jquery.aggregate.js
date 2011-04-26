/*--------------------------------------------*
 * https://github.com/kilhage/jquery-aggregate
 *--------------------------------------------*
 * Author Emil Kilhage
 * MIT Licensed
 *--------------------------------------------*
 * Last Update: 2011-04-27 00:31:39
 * Version x
 *--------------------------------------------*/
(function($, window, undefined) {

var EVENT_NAME = "aggregate",
    DATA_NAME = "aggregatorHandler",
    TARGET = "target",
    SOURCE = "source",
    element_types = [TARGET, SOURCE],

    unformat_number_regexps = {},
    format_number_regexps = {},
    handler_message_prefix = "$.aggregator.handler::",

    String = window.String,
    parseInt = window.parseInt,
    parseFloat = window.parseFloat,
    slice = window.Array.prototype.slice;

/**
 * Proxy methods to interact with the aggregator-handlers
 */
var methods = {
    
    aggregate: function() {
        return this.trigger(EVENT_NAME);
    },
    
    remove: function() {
        var args = arguments;
        
        return this.each(function() {
            
            var handler = $.aggregator.get(this);
            
            if ( $.aggregator.isHandler(handler) )
                handler.destroy.apply(handler, args);
        });
    },
    
    get: function() {
        var element = this[0], 
            aggregators = false, 
            handler;

        if ( element ) {
            handler = $.aggregator.get(element);
            
            if ( $.aggregator.isHandler(handler) )
                aggregators = handler.get.apply(handler, arguments)
        }
        
        return aggregators;
    }
    
};

methods.destroy = methods.remove;

$.fn.aggregate = function(target, parser, method) {
    
    var type = typeof target, options = {}, args = arguments;
    
    if ( ! target )
        return this.trigger(EVENT_NAME);
        
    if( type == "string" && $.type(methods[target]) == "function" )
        return methods[target].apply(this, slice.call(args, 1));
    
    if ( type === "function" )
        return this.bind(EVENT_NAME, target);
    
    if ( type == "string" || target.nodeType || target.jquery ) {
        options.target = target;
        
        if ( typeof oarser == "function" )
            this.bind(EVENT_NAME, parser);
        
        else if ( parser )
            options.parser = parser;

        if ( method )
            options.method = method;
    }
    else if ( type == "object" ) options = target;
    
    var aggregator = new $.aggregator(this, options);
    
    return aggregator;
};

/**
 * Constructor
 * 
 * @param source
 * @param options
 */
$.aggregator = function(source, options) {
    var self = this;
    if ( ! $.aggregator.isAggregator(self) )
        return new $.aggregator(source, options);
    
    this.aggregateCallback = function() {
        self.aggregate();
    };
    
    self.source = $(source);
    options = self.options = $.aggregator.parseOptions(options);
    self.target = $(options.target);
    delete options.target;
    self.updateAttrs().bind();
    
    self.value = self.getAggregatedValue();
    
    if ( self.options.start_by_aggregate === true )
        self.aggregate();
};

$.extend($.aggregator, {
    
    /* Constants */
    DATA_NAME: DATA_NAME,
    EVENT_NAME: EVENT_NAME,
    SOURCE: SOURCE,
    TARGET: TARGET,
    
    /* Instance methods */
    prototype: {
        
        _is_aggregating: false,
        
        /**
         * Updates the target and source attribute-cache
         * @return self
         */
        updateAttrs: function(){
            return this.updateTargetAttrs().updateSourceAttrs();
        },
        
        /**
         * @return self
         */
        bind: function() {
            var self = this;
            return self._bindSource(self.source)._bind(self.target, true);
        },
        
        /**
         * @return self
         */
        _bind: function(elem, is_target) {
            var data = {
                aggregator: this,
                type: (is_target ? $.aggregator.TARGET : $.aggregator.SOURCE)
            };
            
            elem.bind(EVENT_NAME, data, this.aggregateCallback);
            
            return this;
        },
        
        /**
         * @return self
         */
        _bindSource: function(elem) {
            elem.bind(this.options.onEvent, this.aggregateCallback);
            this._bind(elem);
            return this;
        },
        
        /**
         * Unbinds all elements from the aggregate event
         *
         * @return self
         */
        unbind: function() {
            var self = this;
            self._unbind(self.source, true);
            
            self.target.unbind(EVENT_NAME, this.aggregateCallback);
            
            return self;
        },
        
        /**
         * Unbinds an elements aggregator events
         *
         * @return self
         */
        _unbind: function(elem, unbind_all) {
            elem = $(elem);
            elem.unbind(this.options.onEvent, this.aggregateCallback);
            
            if ( unbind_all )
                elem.unbind(EVENT_NAME, this.aggregateCallback);
            
            return this;
        },
        
        /**
         * Removes a source-element from the instance
         *
         * @param <mixed> elem
         * @see self::removeFromHandler
         * @return self
         */
        remove: function(elem) {
            var self = this;
            elem = $(elem);
            var elem_to_remove = elem[0];
            
            self.source = self.source.filter(function(i, elem) {
                var is = elem == elem_to_remove;
                
                if ( is )
                    self.removeFromHandler(elem);
                
                return ! is;
            });
            
            return self._unbind(elem).updateAttrs();
        },
        
        /**
         * Destroys the instance and removes the instance from all
         * source and target elements handlers
         * 
         * @see self::removeFromHandler
         * @return self
         */
        destroy: function() {
            var self = this;
            
            $.each(element_types, function(i, type) {
                self[type] = self[type].filter(function(i, elem) {
                    self.removeFromHandler(elem, type);
                    return false;
                });
            });
            
            return this;
        },
        
        /**
         * Removes this instance from an elements handler
         * @param <mixed> elem
         * @param <string> type
         * @return self
         */
        removeFromHandler: function(elem, type) {
            var handler = $.aggregator.get(elem);
            
            if ( ! $.aggregator.isHandler(handler) )
                $.error("$.aggregator::removeFromHandler: element is not bound to a aggregator-handler");
            
            handler.remove(this, type);
            return this;
        },
        
        /**
         * Updates the target elements with the 
         * aggregaded value from all source-elements
         *
         * @return self
         */
        aggregate: function() {
            var self = this;
            if ( self._is_aggregating == false ) {

                var value = this.getAggregatedValue();

                if ( self.options.tostring === true )
                    value = String(value);

                // Only update the targets if the value is changed
                if (  value !== self.value || ! value ) {

                    self.value = value;

                    // Avoids an infinate loop when triggering the 
                    // aggregate event on the target elements
                    self._is_aggregating = true;

                    self.source.trigger(EVENT_NAME, [self, SOURCE]);

                    self.target.each(function(i, elem) {
                        //// The change event should only be triggered 
                        // if the target-element is changed
                        if ( elem[self.target_attrs[i]] !== value ) {
                            
                            elem[self.target_attrs[i]] = value;
                            $(this).trigger("change");
                        }

                    }).trigger(EVENT_NAME, [self, TARGET]);

                    self._is_aggregating = false;

                }
            }

            return self;
        },

        /**
         * @return mixed
         */
        getAggregatedValue: function() {
            var self = this, options = self.options;
            
            var parsed_values = [];
            self.source.each(function(i, elem) {
                var value = options.parser.call(self, elem[self.source_attrs[i]], this);
                
                if ( options.fix_NaN === true && isNaN(value) ) 
                    value = options.value_if_NaN;
                
                parsed_values.push(value);
            });
            
            var value = parsed_values.length > 0 ?
                    options.method.call(parsed_values, this) : options.empty_value;
            
            return options.converter ? options.converter.call(this, value) : value;
        }
        
    },
    
    /**
     * Default options
     */
    options: {
        // The events that will trigger the aggregator to update the target elements
        onEvent: "change keyup",
        // The method that is used to aggregate the values
        method: "sum",
        // The parser that is used for parsing the string
        parser: "int",
        
        fix_NaN: true,
        value_if_NaN: 0,
        empty_value: 0,
        
        tostring: true,
        
        // Used when you are using "formatedNumber" as parser.
        sep: ",",
        dec: ".",
        group: 3,

        // If set to true, the target elements will be 
        // updated with the aggregated value when the aggregator is initalized
        start_by_aggregate: true
    },
    
    /**
     * @param <mixed> elem
     * @return boolean
     */
    isAggregator: function(elem) {
        return elem instanceof $.aggregator;
    },
    
    /**
     * @param <mixed> elem
     * @return boolean
     */
    isHandler: function(elem) {
        return elem instanceof $.aggregator.handler;
    },
    
    /**
     * Makes it possible to create your own aggregate methods
     * 
     * @param <string> name
     * @param <function> fn
     * @return void
     */
    addMethod: function(name, fn) {
        if ( !name || $.type(fn) != "function" ) return;
        aggregate_methods[name] = fn;
    },
    
    /**
     * Makes it possible to create your own parsers
     * 
     * @param <string> name
     * @param <function> fn
     * @return void
     */
    addParser: function(name, fn) {
        if ( !name || $.type(fn) != "function" ) return;
        parsers[name] = fn;
    },
    
    /**
     * Finds the instance of the aggregator handler that contains all the 
     * aggregator-collections that the element is a part of
     * 
     * @param <mixed> elem
     * @return instanceof $.aggregator.handler if bound, else undefined
     */
    get: function(elem) {
        var handler = $(elem).data(DATA_NAME);
        return handler && $.aggregator.isHandler(handler) ? handler : undefined;
    },
    
    /**
     *
     * @param <object> options
     * @return <object>
     */
    parseOptions: function(options) {
        var _options = {};
        
        if ( typeof options == "string" ) 
            options = {target: options};
        
        $.extend(true, _options, $.aggregator.options, options);

        if ( typeof _options.parser == "string" && converters[_options.parser] )
            _options.converter = converters[_options.parser];

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
        
        elem = $(elem).filter(function() {
            var add = $.inArray(this, elems) == -1;
            
            if ( add )
                elems[elems.length++] = this;
            
            return add;
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

/**
 * Constructor
 * 
 * Gets bound to all elements that get bound to the aggregate event
 * 
 * @param <HTML node> element
 */
$.aggregator.handler = function(element) {
    this.element = element;
    this.source = [];
    this.target = [];
};

$.aggregator.handler.prototype = {
    
    /**
     * 
     */
    get: function(type, index) {
        if ( ! type ) {
            return $.merge($.merge([], this.source), this.target);
        }
        
        if ( $.inArray(type, element_types) == -1 )
            $.error("invalid type: " + type);
        
        var aggregators = this[type];
        
        if ( ! aggregators ) 
            $.error(handler_message_prefix+"add: invalid type: "+type);
        
        return typeof index == "number" ? aggregators[index] : aggregators;
    },
    
    /**
     * Adds an aggregator to the a collection
     * 
     * @param <instanceof $.aggregator> aggregator: 
     * @param <string> type: "target" or "source"
     * @return self
     */
    add: function(aggregator, type) {
        var aggregators = this.get(type);
        
        if ( ! $.aggregator.isAggregator(aggregator) ) 
            $.error(handler_message_prefix+"add: invalid input: aggregator is not an instance of $.aggregator");
        
        if ( $.inArray(aggregator, aggregators) == -1 )
            aggregators.push(aggregator);
        
        return this;
    },
    
    /**
     * @param <instanceof $.aggregator> aggregator: 
     * @param <string> type: "target" or "source"
     * @return self
     */
    remove: function(aggregator, type) {
        var self = this;
        
        $.each(type ? [type] : element_types, function(_, type) {
            var aggregators = self.get(type), i;

            while ( (i = $.inArray(aggregator, aggregators)) != -1  )
                aggregators.splice(i, 1);
        });
        
        return self;
    },
    
    /**
     * Removes the element from all aggregators that the element is a source of
     * @return self
     */
    destroy: function(type) {
        return this._callAggregatorMethod("remove", type, [this.element]);
    },
    
    /**
     * Updates all aggregators that the element is a source of
     * @return self
     */
    aggregate: function(type) {
        return this._callAggregatorMethod("aggregate", type);
    },
    
    /**
     * Proxy method to the $.aggregator instances
     * 
     * @param <string> name: the name of the method
     * @param <array> args: arguments
     * @return self
     */
    _callAggregatorMethod: function(name, type, args) {
        var self = this,
            aggregators = this.get(type || SOURCE), 
            i = aggregators.length, 
            aggregator;
        
        args || (args = []);
        
        while ( i-- ) {
            aggregator = aggregators[i];
            if ( aggregator ) {
                aggregator[name].apply(aggregator, args);
            }
        }
        
        return self;
    }
    
};

$.event.special[EVENT_NAME] = {
    
    /**
     * Creates and stores the $.aggregator.handler when
     * the element is first bound to the aggregate event
     */
    setup: function() {
        $.data(this, DATA_NAME, new $.aggregator.handler(this));
    },
    
    /**
     * Adds the aggregator the the handler when a new aggregator is bound the the aggregate event
     */
    add: function(info) {
        var data = info.data;
        if ( ! data ) return;
        
        var handler = $.aggregator.get(this);
        
        if ( $.aggregator.isHandler(handler) && $.aggregator.isAggregator(data.aggregator) ) {
            handler.add(data.aggregator, data.type);
        }
    },
    
    /**
     * Remvoes the handler when the element is unbound 
     * from the aggregate element/is destroyed
     */
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

function getContentAttr(elem) {
    return elem ? ($(elem).is("input,textarea") ? "value" : "innerHTML") : null;
}

/**
 * Default parsers that parses the element values
 */
var parsers = {
    "int": function(num) {
        return parseInt(num, 10);
    },
    "float": function(num) {
        return parseFloat(num);
    },
    formatedNumber: function(n) {
        var options = this.options,
            dec = options.dec;
            
        n = n ? String(n) : '';

        if ( n.length > 0 ) {
            var num_grp_sep_re = unformat_number_regexps[dec] ||
                    (unformat_number_regexps[dec] = new RegExp('\\' + dec, 'g'));

            n = n.replace(num_grp_sep_re, '').replace(options.sep, '.');
        }

        if ( n.length > 0 ) {
            return parseFloat(n);
        }

        return 0;
    }
};

var converters = {
    formatedNumber: function(n) {
        var options = this.options,
            dec = options.dec,
            group = options.group;
            
        n = n ? String(n) : '';

        if ( n.split )
            n = n.split('.');
        else
            return n;

        if ( n.length > 2 )
            return n.join('.');
        
        var rnum = format_number_regexps[group] ||
                        (format_number_regexps[group] = new RegExp("(\\d+)(\\d{"+group+"})"));
        
        while ( dec != '' && rnum.test(n[0]) ) {
            n[0] = n[0].replace(rnum, '$1' + dec + '$2');
        }

        return n[0] + (n.length > 1 && n[1] != '' ? options.sep + n[1] : '');
    }
};

/**
 * Default methods that aggregates values
 */
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
