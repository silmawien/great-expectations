(function () {

    // event handlers
    //

    var blockProcessKey = false;

    $("#q").keyup(function(e) {
        if (blockProcessKey) {
            return;
        }
        if (e.which == 13) {
            fullSearch();
            // workaround for IMEs that send 229 after enter
            blockProcessKey = true;
            setTimeout(function() {
                blockProcessKey = false;
            }, 500);
            return;
        }
        var query = $("#q").val();
        if (query) {
            lookup({q: query, limit: 10});
        }
    });

    $("#s").click(function(e) {
        $.get("/stop", {}, function(data) {});
    });

    $("#next").click(function(e) {
        $.get("/step", { value: 1 }, function(data) {});
    });

    $("#prev").click(function(e) {
        $.get("/step", { value: -1 }, function(data) {});
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

    function toast(item, data) {
        item.css("padding-left", "+=20");
        item.animate({ "padding-left": "-=20" }, "fast");
    }

    function lookup(params) {
        csGet("/lsmp3", params, function(data) {
            $("#stats").text(data.stats[0] + " / " + data.stats[1]);
            var hits = $("#hits");
            hits.html("");
            $.each(data.results, function(key, value) {
                if (key == "") key = "/";
                $('<div class="category"/>').text(key).appendTo(hits);

                $.each(value, function(index, song) {
                    var display = song[0];
                    var filepath = song[1];
                    var item = $('<div class="song"/>')
                    item.data('fp', filepath)
                    item.text(display)
                    item.click(function() {
                        $.get("/click", { fp: item.data('fp') }, function(data) {
                            toast(item, data);
                        });
                    });
                    item.appendTo(hits);
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
    // which must call next() explicitly to allow further calls to occur.
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
