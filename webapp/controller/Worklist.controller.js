sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/PDFViewer",
    'sap/m/Token',
    "sap/m/MessageBox",
    "sap/m/MessageToast",
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, PDFViewer, oToken, oMsgBox, oMsgToast) {
    "use strict";
    var oView, i18n, prdOrderMultiInp, prdOrderString, oDataModel;
    return BaseController.extend("r124pdf.controller.Worklist", {

        formatter: formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        /**
         * Called when the worklist controller is instantiated.
         * @public
         */
        onInit: function () {
            oView = this.getView();
            //Fetch i18n Model
            i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            //OData Default model 
            oDataModel = this.getOwnerComponent().getModel();
            //Production order multi intput
            prdOrderMultiInp = this.getView().byId("idProdOrd");
            // add validator
            var fnValidator = function (args) {
                var text = args.text;
                return new oToken({ key: text, text: text });
            };
            prdOrderMultiInp.addValidator(fnValidator);
            //PDF JSON Model
            this._oModel = new JSONModel({
                Source: "",
                Title: "PDF",
                Height: "500px"
            });
        },

        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        /**
         * Triggered by the table's 'updateFinished' event: after new table
         * data is available, this handler method updates the table counter.
         * This should only happen if the update was successful, which is
         * why this handler is attached to 'updateFinished' and not to the
         * table's list binding's 'dataReceived' method.
         * @param {sap.ui.base.Event} oEvent the update finished event
         * @public
         */
        onUpdateFinished: function (oEvent) {
            // update the worklist's object counter after the table update
            var sTitle,
                oTable = oEvent.getSource(),
                iTotalItems = oEvent.getParameter("total");
            // only update the counter if the length is final and
            // the table is not empty
            if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
                sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
            } else {
                sTitle = this.getResourceBundle().getText("worklistTableTitle");
            }
            this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
        },

        /**
         * Event handler when a table item gets pressed
         * @param {sap.ui.base.Event} oEvent the table selectionChange event
         * @public
         */
        onPress: function (oEvent) {
            // The source is the list item that got pressed
            this._showObject(oEvent.getSource());
        },

        /**
         * Event handler for navigating back.
         * Navigate back in the browser history
         * @public
         */
        onNavBack: function () {
            // eslint-disable-next-line fiori-custom/sap-no-history-manipulation, fiori-custom/sap-browser-api-warning
            history.go(-1);
        },


        onSearch: function (oEvent) {
            if (oEvent.getParameters().refreshButtonPressed) {
                // Search field's 'refresh' button has been pressed.
                // This is visible if you select any main list item.
                // In this case no new search is triggered, we only
                // refresh the list binding.
                this.onRefresh();
            } else {
                var aTableSearchState = [];
                var sQuery = oEvent.getParameter("query");

                if (sQuery && sQuery.length > 0) {
                    aTableSearchState = [new Filter("Msg", FilterOperator.Contains, sQuery)];
                }
                this._applySearch(aTableSearchState);
            }

        },

        /**
         * Event handler for refresh event. Keeps filter, sort
         * and group settings and refreshes the list binding.
         * @public
         */
        onRefresh: function () {
            var oTable = this.byId("table");
            oTable.getBinding("items").refresh();
        },

        onGetFilePress: function (oEvt) {
            prdOrderMultiInp = this.getView().byId("idProdOrd");
            if (prdOrderMultiInp.getTokens().length === 0) {
                oMsgToast.show(i18n.getText("pleaseEnterProductionOrder"));
                return;
            }
            prdOrderString = "";
            for (var i = 0; i < prdOrderMultiInp.getTokens().length; i++) {
                if (i === 0) {
                    prdOrderString = prdOrderMultiInp.getTokens()[i].getKey();
                } else {
                    prdOrderString = prdOrderString + "_" + prdOrderMultiInp.getTokens()[i].getKey();
                }
            }
            this._getPDFOutPut();

        },
        /**
           * Event handler Production Order Scan
           * @param {oEvt} Event Handle for scan button
           * @public
           */
        onProdOrdScanSuccess: function (oEvt) {
            prdOrderMultiInp.addToken(new oToken({
                // key: oEvt.getParameters().text,
                text: oEvt.getParameters().text
            }));
            prdOrderMultiInp.fireChange();
        },
        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */
        onProdOrderChange: function (oEvent) {
            var Product = oEvent.getSource().getValue();
          
            var sPath = "/Search_FileSet(Orderno='" + Product + "')";
            var oSuccess = function (oData) {
                sap.ui.core.BusyIndicator.hide();
                if(oData.MessType === "E"){
                 
                    var oMultiInput = this.getView().byId("idProdOrd");
                    for (var i = 0; i < oMultiInput.getTokens().length; i++) {
                       var  prdOrderString = oMultiInput.getTokens()[i].getKey();
                       if(prdOrderString === Product){
                        var tokens = oMultiInput.getTokens();
                        tokens.forEach(function(token){
                            if(token.getText()===prdOrderString ){
                                oMultiInput.removeToken(token);
                            }
                        });
                        oMultiInput.removeToken(prdOrderString);
                       }
                    }                   
                    sap.m.MessageToast.show(oData.Message);
                    return;
                    }
                    else{
                        sap.m.MessageToast.show(oData.Message);
                    }
            }.bind(this);
            var oError = function (error) {
                sap.ui.core.BusyIndicator.hide();

            }.bind(this);
            sap.ui.core.BusyIndicator.show();
            this.getOwnerComponent().getModel().read(sPath, {
                success: oSuccess,
                error: oError
            });
        },

        _getPDFOutPut: function () {
            if (prdOrderString.trim().length > 0) {
                var sServiceURL = oDataModel.sServiceUrl;
                var sSource = sServiceURL + "/Save_FileSet(Orderno='" + prdOrderString + "')/$value";
                this._oModel.setProperty("/Source", sSource);
                this.getView().setModel(this._oModel);
            }
        }


    });
});
