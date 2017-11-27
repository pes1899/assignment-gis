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
    var districtPolygon;

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

        this.districts = ko.observableArray([]);
        this.selectedDistrict = ko.observable("");
        this.selectedPoi = ko.observable("hospital");
        this.length = ko.observable("");

        this.selectedDistrict.subscribe(this.on_selectedDistrict, this);
    };

    //#endregion

    Model.prototype.on_selectedDistrict = function (val) {
        var item = $.grep($this.districts(), function (item) {
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

        if (districtPolygon) {
            districtPolygon.remove();
        }

        districtPolygon = L.geoJSON(item.geom, {
            style: myStyle
        }).addTo(app.map);

        app.map.fitBounds(districtPolygon.getBounds());
    };

    //#region [ Event Handlers ]

    Model.prototype.onNewGame = function () {
        if ($this.districts().length > 0) {
            return;
        }

        var url = app.url + "Home/Districts";
        $.ajax({
            url: url,
            success: function (data) {
                data = JSON.parse(data);
                data.forEach(function (item, i) {
                    data[i] = JSON.parse(item);
                    data[i].geom = JSON.parse(data[i].geom);
                });
                $this.districts(data);
            }
        });
    };

    Model.prototype.refresh = function (e) {
        graphics.forEach(function (item) {
            item.remove();
        });

        if (districtPolygon) {
            districtPolygon.remove();
        }

        $this.selectedDistrict("");
        $this.selectedPoi("hospital");
        $this.length("");
        $this.onNewGame();
    };

    /*
    * GO.
    */
    Model.prototype.go = function (e) {
        graphics.forEach(function (item) {
            item.remove();
        });

        var item = $.grep($this.districts(), function (item) {
            return item.name == $this.selectedDistrict();
        })[0];
        if (!item) {
            return;
        }
        
        $.ajax({
            url: app.url + "Home/FarestPoint",
            type: "POST",
            data: {
                poi: $this.selectedPoi,
                gid: item.gid
            },
            success: function (data) {
                var myStyle = {
                    "color": "#ff0000",
                    "weight": 5,
                    "opacity": 1
                };
                data = JSON.parse(data);

                data.forEach(function (item, i) {
                    data[i] = JSON.parse(item); 
                    data[i].farestpoint = JSON.parse(data[i].farestpoint);
                    data[i].connectline = JSON.parse(data[i].connectline);
                    data[i].points = JSON.parse(data[i].points);

                    var farestpoint = L.geoJSON(data[i].farestpoint, {
                        style: myStyle
                    }).addTo(app.map);

                    graphics.push(farestpoint);

                    var connectline = L.geoJSON(data[i].connectline, {
                        style: myStyle
                    }).addTo(app.map);
                    //dlzka
                    var previousPoint;
                    var length;
                    L.polyline(data[i].connectline.coordinates).getLatLngs().forEach(function (latLng) {
                        if (previousPoint) {
                            length = previousPoint.distanceTo(latLng);
                        }
                        previousPoint = latLng;
                    });
                    $this.length(length);
                    graphics.push(connectline);

                    var points = L.geoJSON(data[i].points, {
                        style: myStyle
                    }).addTo(app.map);

                    graphics.push(points);
                });
            }
        });
    };

    //#endregion

    return Model;
});