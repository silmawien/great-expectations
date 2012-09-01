(function () {

    // BB Model
    //

    /*var*/ Entry = Backbone.Model.extend({

        defaults: function() {
            return {
                display: "no song"
            };
        },

        initialize: function() {
            if (!this.get("display")) {
                this.set({"display": this.defaults.display});
            }
        },

        clear: function() {
            this.destroy();
        },

    });

    /*var*/ Playlist = Backbone.Collection.extend({

        model: Entry,

        localStorage: new Store("playlist"),

    });

    /*var*/ playlist = new Playlist;

    // BB View
    //

    // event handlers
    //

    // workaround for IMEs that send 229 after enter
    var blockProcessKey = false;

    $("#q").keyup(function(e) {
        if (blockProcessKey) {
            return;
        }
        var query = $("#q").val();
        if (e.which == 13) {
            lookup({q: query});
            blockProcessKey = true;
            setTimeout(function() {
                blockProcessKey = false;
            }, 500);
        }
        if (query) {
            lastQuery = query;
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

    var checked = [];

    // check / uncheck song
    $("#hits").on("change", "input", function(e) {
        var id = e.target.id;
        var oldIndex = checked.indexOf(id);
        if (oldIndex != -1) {
            checked.splice(oldIndex, 1);
        }
        if (e.target.checked) {
            checked.push(id);
        }
    });

    // enqueue checked songs
    $("#queue-selected").click(function(e) {
        $.each(checked, function(index, filepath) {
            $.get("/click", { fp: filepath }, function(data) {
                console.log("clicked: " + filepath);
            });
        });

        // clear selection
        $("input[name='songcb']").attr('checked', false);
        checked = [];
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
                    var item = $('<div class="song"/>');
                    var id = filepath;
                    var checkbox = $('<input name="songcb" type="checkbox" id="' + id + '"/>');
                    item.append(checkbox);
                    item.append($('<label for="' + id + '"/>').text(display));
                    item.appendTo(hits);
                });
            });
            //$("#pre").html(data);
        });
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

})();
