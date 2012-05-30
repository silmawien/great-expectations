(function () {

    // event handlers
    //

    $("#f").submit(fullSearch);
    $("#q").keyup(function(e) {
        if (e.which == 13) {
            //e.preventDefault();
            return;
        }
        var query = $("#q").val();
        if (query) {
            lookup(query, 10);
        }
    });

    // serialized, cached ajax query
    var lookup = mkcache1(mkserial(function(next, query, limit) {
        var params = { q: query }
        if (limit) {
           params.limit = limit;
        } else {
           params.nocache = "true";
        }

        $.get("/lsmp3", params, function(data) {
            $("#pre").html(data);
            next();
        });
    }));

    function fullSearch() {
        var query = $("#q").val();
        lookup(query);
        return false;
    }

    // Utilities
    //

    // Create a memoizer that caches only the last seen arguments.
    function mkcache1(f) {
        var cache = { k: null, value: null };
        return function() {
            var key = JSON.stringify(arguments);
            if (key != cache.k) {
                cache.k = key;
                cache.value = f.apply(this, arguments);
            }
            return cache.value;
        }
    }

    // Given an async function f(next, ...), return a new function f'(...)
    // which will serialize calls. You must call next() before returning from
    // f.
    function mkserial(f) {
        var state = {
            queued: null,      // queued arguments
            that: null,        // queued context
            inProgress: false
        };
        var next = function() {
            if (state.queued != null) {
                // make the next call
                var args = state.queued;
                var that = state.that;
                state.queued = null;
                state.that = null;

                args = Array.prototype.slice.call(args);
                args.unshift(next);
                f.apply(that, args);
            } else {
                // all done
                state.inProgress = false;
            }
        }
        var wrapper = function() {
            if (state.inProgress) {
                // defer, overwriting any previously queued call
                state.queued = arguments;
                state.that = this;
            } else {
                // start new
                state.inProgress = true;

                var args = Array.prototype.slice.call(arguments);
                args.unshift(next);
                f.apply(this, args);
            }
        }
        return wrapper;
    }

    // function doit(next, cb, param1) {
    //     setTimeout(function() {
    //         cb(param1);
    //         next();
    //     }, 1000);
    // }
    //
    // doitnow = mkserial(function(next, cb, param1) {
    //     if (param1 == 1) {
    //         doit(next, cb, param1);
    //     } else {
    //         cb(param1);
    //         next();
    //     }
    // });
    //
    // // should print 1, 2, 3
    // function testSerial() {
    //     var pr = function(param1) { console.log(param1); };

    //     doitnow(pr, 1);
    //     doitnow(function(param1) {
    //         pr(param1);
    //         doitnow(pr, 3);
    //     }, 2);
    // }

    // gtest = testSerial;
})();
