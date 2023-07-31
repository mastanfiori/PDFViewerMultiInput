/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"r124pdf/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});