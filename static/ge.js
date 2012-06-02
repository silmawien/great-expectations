(function () {

    // event handlers
    //

    //$("#f").submit(fullSearch);
    $("#q").keyup(function(e) {
        if (e.which == 13) {
            fullSearch();
            //e.preventDefault();
            return;
        }
        var query = $("#q").val();
        if (query) {
            lookup({q: query, limit: 10});
        }
    });

    function progressControl(inProgress) {
        $("#q").toggleClass("busy", inProgress);
    }

    // cached and serialized version of $.get(url, params, success)
    var csGet = mkcache1(mkserial(function(next, url, params, success) {
        return $.get(url, params, function(data) {
            success(data);
        }).complete(next);
    }, progressControl));

    function lookup(params) {
        csGet("/lsmp3", params, function(data) {
            var json = JSON.parse(data);
            var hits = $("#hits");
            $("#stats").text(json.stats[0] + " / " + json.stats[1]);
            hits.html("");
            $.each(json.results, function(key, value) {
                if (key == "") key = "/";
                $('<div class="category"/>').text(key).appendTo(hits);

                $.each(value, function(index, song) {
                    display = song[0];
                    filepath = song[1];
                    $('<div class="song"/>').data('fp', filepath).text(display).appendTo(hits);
                });
            });
            //$("#pre").html(data);
        });
    }

    function fullSearch() {
        var query = $("#q").val();
        lookup({q: query, nocache: true});
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
    function mkserial(f, progressIndicator) {
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
                progressIndicator(false);
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
                progressIndicator(true);

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
