// TODO don't pollute global name space

function doQuery(qs, limit, success) {
    $.get("/lsmp3", { q: qs, limit: limit }, success);
}

var queryState = {
    last: { q: '', limit: false },
    inProgress: false,
    queued: null
};

function refresh(query, limit) {
    if (query.inProgress) {
        if (queryState.queued) {
            clearTimeout(queryState.queued);
        }
        queryState.queued = setTimeout(function() {
            queryState.queued = null;
            refresh(query, limit);
        }, 1000);
        return;
    }
    if (query == queryState.last.q && limit == queryState.last.limit) {
        return;
    }
    queryState.inProgress = true;
    params = { q: query }
    if (limit) {
       params.limit = limit;
    } else {
       params.nocache = "true";
    }
    $.get("/lsmp3", params, function(data) {
        queryState.inProgress = false;
        queryState.last = { q: query, limit: limit };
        $("#pre").html(data);
    });
}

function fullSearch() {
    var query = $("#q").val();
    refresh(query);
    return false;
}

$("#b").click(fullSearch);
$("#f").submit(fullSearch);

$("#q").keyup(function(e) {
    if (e.which == 13) {
        //e.preventDefault();
        return;
    }
    var query = $("#q").val();
    if (query) {
        refresh(query, 10);
    }
});

