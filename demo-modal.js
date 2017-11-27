define([
    "knockout"
], function (ko) {
    //#region [ Constructor ]

    /**
	 * Constructor.
	 *
	 * @param {object} args Contructor arguments.
	 */
    var Model = function (args) {
        args = args || {};

        this.templateId = "demo-modal-template";
        this.title = ko.observable(args.title || "");
        this.text = ko.observable(args.text || "");
    };

    //#endregion

    return Model;
});