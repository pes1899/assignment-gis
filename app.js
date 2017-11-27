define([
	"require",
	"module",
	"jquery",
    "ajaxTransport",
    "knockout",
    "knockoutvalidation",
    "router",
    "materialize",
    "waves",
    "isMobile",
    "optiscroll",
    "i18n!nls/resources"
], function (require, module, $, ajaxTransport, ko, koValidation, Router, Materialize, Waves, isMobile, Optiscroll, resx) {
    var global = (function () { return this; })();
    var $this = null;

    //#region [ Constructor ]

    /**
	 * Constructor.
	 *
	 * @param {object} args Contructor arguments.
	 */
    var Application = function (args) {
        $this = this;

        args = args || {};

        this.version = args.version || "";
        this.variant = args.variant || "";
        this.url = args.url || "/";
        this.locale = global.document.documentElement.lang || "sk";
        this.plugins = (args.plugins instanceof Array) && (args.plugins.length > 0) ? args.plugins : [];

        this.router = Router;
        this.md = Materialize;
        this.isMobile = isMobile;

        this.resx = resx;
    };

    //#endregion


    //#region [ Event Handlers ]

    /**
	 * Event handler for the route changing.
	 *
	 * @param {object} e Event arguments - the changing route.
	 */
    Application.prototype._router_onRouteChange = function (e) {
        $($this).triggerHandler("routechange", [e]);
    };


    /**
	 * Event handler for the route not found.
	 *
	 * @param {object} e Event arguments - route tokens.
	 */
    Application.prototype._router_onRouteNotFound = function (e) {
        console.warn("Application : _router_onRouteNotFound(%o)", e);
        $($this).triggerHandler("routenotfound", [e]);
    };


    /**
	 * Fix scrolling into view when clickin on label.
	 *
	 * @param {object} e Event arguments.
	 */
    Application.prototype._label_onClick = function (e) {
        e.preventDefault();
        $("#" + $(this).attr("for")).trigger("click");
    };

    //#endregion


    //#region [ Methods : Private ]	

    /**
	 * Loads the plugins.
	 *
	 * @return {object} Returns promise resolved when all plugins are loaded.
	 */
    Application.prototype._loadPlugins = function () {
        var dfr = $.Deferred();

        var ids = $this.plugins.slice(0);
        $this.plugins = {};

        // If there are not any plugins end further processing
        if (ids.length <= 0) {
            dfr.resolve();
            return dfr.promise();
        }

        // Load all plugins
        require(ids, function () {
            var plugins = Array.prototype.slice.call(arguments);
            $(plugins).each(function (i, p) {
                var puginId = ids[i];

                // Create plugin instance
                var pInstance = p;

                if (typeof (pInstance) === "function") {
                    pInstance = new p($this, puginId);
                }

                // Store plugin instance
                $this.plugins[puginId] = pInstance;

                // Start the plugin if needed - there is not any waiting for the plugin to start
                if (typeof (pInstance.start) === "function") {
                    pInstance.start();
                }

                // Notify parent about plugin startup
                dfr.notify(puginId);
            });

            // All plugins are started now
            dfr.resolve();
        });

        // Return the Promise so caller can't change the Deferred
        return dfr.promise();
    };

    //#endregion


    //#region [ Methods : Public ]

    /**
     * Displays toast.
     *
     * @param {string} icon Icon name.
     * @param {string} message Message to display.
     * @param {string} displayLength Timeout in milliseconds.
     * @param {string} className Toast class.
     * @param {function} completeCallback Callback function.
     */
    Application.prototype.toast = function (icon, message, displayLength, className, completeCallback) {
        $this.md.toast(icon + "<span>" + message + "</span>", displayLength, className, completeCallback);
    };


    /**
	 * Adds input template as a script tag to the body.
	 *
	 * @param {string} id ID of the script tag.
	 * @param {string} template The html template string - usually used by knockout.
	 */
    Application.prototype.appendTemplate = function (id, template) {
        if ($("#" + id).length > 0) {
            return;
        }

        $("<script>", {
            id: id,
            type: "text/html",
            html: template
        }).appendTo(global.document.body);
    };


    /**
	 * Trrigers event plugin change.
     *
	 * @param {string} plugin Name of activated plugin.
	 */
    Application.prototype.onPluginChange = function (plugin) {
        $($this).triggerHandler("pluginchange", [plugin]);
    };


    /**
	 * Loads the plugins. Use this to load plugins "on the fly", after application has been initialized
	 *
     * @params {object} config RequireJS config object. All keys in the property "config" will be used as plugins.
	 * @return {object} Returns promise resolved when all plugins are loaded.
	 */
    Application.prototype.loadPlugins = function (config) {
        config = config || {};

        // Append require js configuration
        global.require.config(config);

        var dfr = $.Deferred();

        // Get all plugins
        var ids = $.map(config.config || {}, function (value, key) {
            return key;
        });

        // If there are not any plugins end further processing
        if (ids.length <= 0) {
            dfr.resolve();
            return dfr.promise();
        }

        // Load all plugins
        require(ids, function () {
            var plugins = Array.prototype.slice.call(arguments);
            $(plugins).each(function (i, p) {
                var puginId = ids[i];

                // Check if the plugin is not already loaded
                if (typeof ($this.plugins[puginId]) !== "undefined") {
                    console.warn("Application : loadPlugins() : Plugin '%s' is already loaded!", puginId);
                    return;
                }

                // Create plugin instance
                var pInstance = p;

                if (typeof (pInstance) === "function") {
                    pInstance = new p($this, puginId);
                }

                // Store plugin instance
                $this.plugins[puginId] = pInstance;

                // Start the plugin if needed - there is not any waiting for the plugin to start
                if (typeof (pInstance.start) === "function") {
                    pInstance.start();
                }

                // Notify parent about plugin startup
                dfr.notify(puginId);
            });

            // All plugins are started now
            dfr.resolve();
        });

        // Return the Promise so caller can't change the Deferred
        return dfr.promise();
    };


    /**
	 * Starts the application.
	 */
    Application.prototype.start = function () {
        // Add class to the body
        $(global.document.body)
            .addClass("variant-" + this.variant)
            .on("click", "label[for]", $this._label_onClick);

        // Created deferred object
        var dfr = $.Deferred();

        // Attach a done, fail, and progress handler for the _loadPlugins
        $.when(this._loadPlugins()).then(
			function () {
			    dfr.resolve($this);
			},
			function (plugin) {
			    console.warn("Application : start() : Error starting plugin '%s'.", plugin);
			    dfr.resolve($this);
			},
			function (plugin) {
			    console.log("Application : start() : Plugin '%s' started.", plugin);
			}
		);

        // Return the Promise so caller can't change the Deferred
        return dfr.promise();
    };

    //#endregion

    $(function () {
        // Create application instance
        var app = global.app = new Application(module.config());

        // Start the application
        $.when(app.start()).then(function (a) {
            Waves.init();
            console.info("Application is running v" + a.version + ".");
            $this.router.init($this._router_onRouteChange, $this._router_onRouteNotFound);
        });
    });
});