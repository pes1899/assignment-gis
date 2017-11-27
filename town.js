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

        this.town = ko.observable("");
        this.townPoint = ko.observable("");
        this.nearestTowns = ko.observableArray([]);
        this.distance = ko.observable("");
    };

    //#endregion


    //#region [ Event Handlers ]

    Model.prototype.onNewGame = function () {
        var url = app.url + "Home/Town";
        $.ajax({
            url: url,
            success: function (data) {
                data = JSON.parse(data);
                $this.town(data.name);
                $this.townPoint(data.geom);
            }
        });
    };


    Model.prototype._map_onClick = function (e) {
        var townPoint = JSON.parse($this.townPoint());
        var townName = $this.town();
        
        var marker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(app.map);
        graphics.push(marker);

        marker = L.marker([townPoint.coordinates[1], townPoint.coordinates[0]]).addTo(app.map);
        marker.bindTooltip(townName, { permanent: true });
        graphics.push(marker);

        var url = app.url + "Home/NearestTowns";
        $.ajax({
            url: url,
            data: {
                x: e.latlng.lng,
                y: e.latlng.lat,
                name: townName
            },
            success: function (data) {
                if (!data) {
                    return;
                }

                data = JSON.parse(data);
                data.forEach(function (item, i) {
                    data[i] = JSON.parse(item);

                    var geom = JSON.parse(data[i].geom);
                    marker = L.marker([geom.coordinates[1], geom.coordinates[0]]).addTo(app.map);
                    marker.bindTooltip(data[i].name, { permanent: true });
                    graphics.push(marker);
                });
                
                $this.distance(data[0].distfrom);
                $this.nearestTowns(data);
            }
        });

        app.setBasemap("osm");
        app.map.off("click", $this._map_onClick);
    };


    Model.prototype.refresh = function (e) {
        app.map.on("click", $this._map_onClick);

        graphics.forEach(function (item) {
            item.remove();
        });
        $this.nearestTowns([]);
        $this.onNewGame();
        app.setBasemap("watercolor");
    };

    //#endregion

    return Model;
});