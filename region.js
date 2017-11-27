define([
    "underscore",
    "knockout",
    "bindings/mdtextfield",
    "bindings/onenter",
    "bindings/optiscroll"
], function (_, ko) {
    //#region [ Fields ]

    var app = (function () { return this; })().app;
    var $this;
    var graphics = [];
    var regionPolygon;

    //#endregion


    //#region [ Constructor ]

    /**
	 * Constructor.
	 *
	 * @param {object} args Contructor arguments.
	 */
    var Model = function (args) {
        $this = this;
        args = args || {};

        this.regions = ko.observableArray([]);
        this.selectedRegion = ko.observable("");
        this.guess = ko.observable("");
        this.result = ko.observable("");
        this.error = ko.observable("");

        this.selectedRegion.subscribe(this.on_selectedRegion, this);
    };

    //#endregion

    Model.prototype.on_selectedRegion = function (val) {
        var item = $.grep($this.regions(), function (item) {
            return item.name == val;
        })[0];

        if (!item) {
            return;
        }

        var myStyle = {
            "color": "#ff7800",
            "weight": 3,
            "opacity": 0.3
        };
        
        if (regionPolygon) {
            regionPolygon.remove();
        }

        regionPolygon = L.geoJSON(item.geom, {
            style: myStyle
        }).addTo(app.map);
        app.map.fitBounds(regionPolygon.getBounds());
    };

    //#region [ Event Handlers ]

    Model.prototype.onNewGame = function () {
        if ($this.regions().length > 0) {
            return;
        }

        var url = app.url + "Home/Regions";
        $.ajax({
            url: url,
            success: function (data) {
                data = JSON.parse(data);
                data.forEach(function (item, i) {
                    data[i] = JSON.parse(item);
                    data[i].geom = JSON.parse(data[i].geom);
                });
                $this.regions(data);
            }
        });
    };

    Model.prototype.refresh = function (e) {
        graphics.forEach(function (item) {
            item.remove();
        });

        if (regionPolygon) {
            regionPolygon.remove();
        }
        $this.selectedRegion("");
        $this.guess("");
        $this.result("");
        $this.error("");
        $this.onNewGame();
    };

    /*
    * GO.
    */
    Model.prototype.go = function (e) {
        graphics.forEach(function (item) {
            item.remove();
        });

        var item = $.grep($this.regions(), function (item) {
            return item.name == $this.selectedRegion();
        })[0];
        if (!item) {
            return;
        }

        $.ajax({
            url: app.url + "Home/Rivers",
            type: "POST",
            data: {
                region: item.name,
                geom: JSON.stringify(item.geom)
            },
            success: function (data) {
                var myStyle = {
                    "color": "#7B9EC8",
                    "weight": 5,
                    "opacity": 1
                };
                data = JSON.parse(data);

                data.forEach(function (item, i) {
                    data[i] = JSON.parse(item);
                    data[i].geom = JSON.parse(data[i].geom);

                    var river = L.geoJSON(data[i].geom, {
                        style: myStyle
                    }).addTo(app.map);

                    graphics.push(river);
                });
            }
        });

        $.ajax({
            url: app.url + "Home/RiversCount",
            type: "POST",
            data: {
                region: item.name,
                geom: JSON.stringify(item.geom)
            },
            success: function (data) {
                $this.result(data);

                var error = Math.abs(parseInt(data) - parseInt($this.guess()));
                $this.error(error);
            }
        });
    };

    //#endregion

    return Model;
});