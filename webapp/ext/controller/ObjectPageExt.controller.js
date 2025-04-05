sap.ui.define([
	"sap/ui/core/mvc/ControllerExtension",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/Fragment",
	"sap/ui/model/odata/v2/ODataModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/ListItem",
	"sap/ui/model/Sorter",
	"sap/m/BusyDialog",
	"sap/suite/ui/commons/library",
	'sap/m/MessageToast'

], function (ControllerExtension, JSONModel, Fragment, ODataModel, Filter, FilterOperator, ListItem, Sorter, BusyDialog, SuiteLibrary,
	MessageToast) {
	"use strict";

	return sap.ui.controller("cgam.warrantymngmt.ext.controller.ObjectPageExt", {

		onInit: function () {
			this.initializeJSONModel();
			let that = this;
			this.extensionAPI.attachPageDataLoaded(function (oEvent) {
				{
					let spath = oEvent.context.getPath();
					let Vbeln = oEvent.context.getModel().getData(spath).wrty_no;
					that.Objnr = oEvent.context.getModel().getData(spath).objnr;
					that.CreatedBy = oEvent.context.getModel().getData(spath).created_by;
					this.statusProfile = oEvent.context.getModel().getData(spath).Stsma;
					this.Auart = oEvent.context.getModel().getData(spath).doc_type
					this.Vbeln = oEvent.context.getModel().getData(spath).wrty_no;
					//		that.onDocumentflowProcess(Vbeln);
					if(oEvent.context.getModel().getData(spath).customer){
						that.getBusinesspartner(oEvent.context.getModel().getData(spath).customer).then((oCustomerData) => {
							that.getCustomerImageData(oCustomerData.results[0].BusinessPartner).catch(oError => {
								console.log(oError)
							})
						}).catch(oError => {
							console.log(oError)
						})
						}
					that.getStatusData(that.Objnr, that.Auart, that.statusProfile).then(() => {
						that.onloadstatusProcess(that.statusProfile).catch(oError => {
							console.log(oError)
						})
					}).catch(oError => {
						console.log(oError)
					})
				}
			});

		},
		initializeJSONModel: async function () {
			var json = new JSONModel();
			this.getView().setModel(this.getOwnerComponent().getModel());
			this.getView().setModel(json, "HeaderData");
			this.getView().getModel("HeaderData").setSizeLimit(1000);
			this.getView().getModel("HeaderData").setData([]);
		},
		getBusinesspartner : function(sCustomer){
			return new Promise((resolve, reject) => {
				let that = this;
			var oModel = this.getOwnerComponent().getModel();
			var filters = new Array();
			var oFilter = new sap.ui.model.Filter("Customer", sap.ui.model.FilterOperator.EQ, sCustomer);
			filters.push(oFilter);
			var oPath = '/I_Customer_VH';
			oModel.read(oPath, {
				filters: filters,
				success: function (oData) {
					resolve(oData);
				},
				error: function (oError) {
					reject();
				}
			});
			});
		},
		getCustomerImageData: function (SoldToParty) {
			return new Promise((resolve, reject) => {
			var that = this;
			var oCIDataModel = this.getOwnerComponent().getModel("AttachmentModel");
			oCIDataModel.callFunction("/GetAllOriginals", {
				method: "GET",
				urlParameters: {
					"ObjectKey": SoldToParty.toString(), //"1",
					"ObjectType": "BUS1006",
					"SemanticObjectType": "",
					"IsDraft": true,
					"AttachmentFramework": ""
				},
				success: function (oData, response) {
					var imageData = oData.results[0];
					if (imageData) {
						var sPath = "/sap/opu/odata/sap/CV_ATTACHMENT_SRV/OriginalContentSet(Documenttype='" + imageData.Documenttype +
							"',Documentnumber='" + imageData.Documentnumber + "',Documentpart='" + imageData.Documentpart + "',Documentversion='" +
							imageData
							.Documentversion + "',ApplicationId='" + imageData.ApplicationId + "',FileId='" + imageData.FileId + "')/$value";
						that.getView().byId("idAvatar").setSrc(sPath);
					}
					resolve();
				},
				error: function (oError) {
					reject();
				}
			});
			});
			
		},
		getStatusData: function (Objnr, Auart, statusProfile) {
			return new Promise((resolve, reject) => {
				let that = this;
			var oModel = this.getOwnerComponent().getModel();
			var filters = new Array();
			var oFilter = new sap.ui.model.Filter("objnr", sap.ui.model.FilterOperator.EQ, Objnr);
			filters.push(oFilter);
			var ostatusFilter = new sap.ui.model.Filter("DocType", sap.ui.model.FilterOperator.EQ, Auart);
			filters.push(ostatusFilter);
			var ostatusProFilter = new sap.ui.model.Filter("Stsma", sap.ui.model.FilterOperator.EQ, statusProfile);
			filters.push(ostatusProFilter);
			var oPath = '/xCGAMxI_WrtyStatus';
			oModel.read(oPath, {
				filters: filters,
				success: function (oData) {
					if (oData) {
						that.statusData = oData.results;
					}
					resolve()
				},
				error: function (oError) {
					reject()
				}
			});
			})
		},
		onloadstatusProcess: function (statusProfile) {
			return new Promise((resolve, reject) => {
				let that = this;
			var oModel = this.getOwnerComponent().getModel();
			this.getView().getModel("HeaderData").setProperty("/lanes", []);
			this.getView().getModel("HeaderData").setProperty("/PNodes", []);
			var oPath = '/xCGDCxC_TJ30';
			var filters = new Array();
			var oFilter = new sap.ui.model.Filter("Stsma", sap.ui.model.FilterOperator.EQ, statusProfile);
			filters.push(oFilter);
			oModel.read(oPath, {
				filters: filters,
				success: function (oData) {
					if (oData) {
						var data = oData.results;
						that.setStatusData(data);
					}
					resolve()
				},
				error: function (oError) {
					reject()
				}
			});
			})
			
		},
		setStatusData: function (data) {
			var statusData = this.statusData;
			if(statusData.length === 0){
				return;
			}
			this.oProcessFlow = this.getView().byId("ProcessFlow");
			var lanes = [];
			var PNodes = [];
			var aStatus = [];
			for (let i = 0; i < data.length; i++) {
				aStatus.push({
					...data[i],
					...(statusData.find((itmInner) => itmInner.estat === data[i].Estat))
				});
			}
			var text;
			var index = 0;
			var state = SuiteLibrary.ProcessFlowNodeState.Neutral;
			for (var i = 0; i < aStatus.length; i++) {
				this.atexts = [];
				this.alastChanged = [];
				this.alastChanged[0] = "Changed At:";
				this.atexts[0] = "Changed By:";
				if (aStatus[i].utime) {
					let seconds = aStatus[i].utime.ms / 1000;
					var hours = parseInt(seconds / 3600); // 3,600 seconds in 1 hour
					seconds = seconds % 3600; // seconds remaining after extracting hours
					// 3- Extract minutes:
					var minutes = parseInt(seconds / 60); // 60 seconds in 1 minute
					// 4- Keep only seconds not extracted to minutes:
					seconds = seconds % 60;
					let otime = hours + ":" + minutes + ":" + seconds;
					var oDate = sap.ui.core.format.DateFormat.getInstance({
						style: "medium",
						calendarType: sap.ui.core.CalendarType.Gregorian
					});
					this.alastChanged[1] = otime + " " + oDate.format(aStatus[i].udate);
				}
				if (aStatus[i].usnam) {
					this.atexts[1] = aStatus[i].usnam;
					text = aStatus[i].Txt30;
					if (aStatus[i].Inact = 'X') {
						state = SuiteLibrary.ProcessFlowNodeState.Neutral;
					} else {
						state = SuiteLibrary.ProcessFlowNodeState.Positive;
					}

					PNodes.push({
						"atexts": this.atexts,
						"id": index,
						"text": text,
						"state": state,
						"laneId": i,
						"alastChanged": this.alastChanged
					});
					index = index + 1;
				} else {
					text = aStatus[i].Txt30;
					state = state;

				}
				lanes.push({
					"id": i,
					"text": aStatus[i].Txt30,
					"position": i,
				});
			}
			if (index == 0) {
				state = SuiteLibrary.ProcessFlowNodeState.Positive;
				this.atexts[1] = this.CreatedBy;
				PNodes.push({
					"id": index,
					"atexts": this.atexts,
					"text": text,
					"state": state,
					"laneId": index,
					"alastChanged": this.alastChanged
				});
			}
			for (var j = 0; j < PNodes.length; j++) {
				if (PNodes.length - 1 !== j) {
					PNodes[j].children = [j + 1];
				} else { // the last record's children empty
					PNodes[j].children = [];
				}
			}
			this.getView().getModel("HeaderData").setProperty("/lanes", lanes);
			this.getView().getModel("HeaderData").setProperty("/PNodes", PNodes);

		},
		onNodePressProcessFlow: function (event) {
			var nodeId = event.getParameters().getNodeId();
			if (nodeId == 0) {
				MessageToast.show("Last Changed By " + this.atexts[1]);
			} else {
				MessageToast.show("Last Changed By " + this.atexts[1] + "At" + this.changeTime + this.changedate);
			}
		},

		urlCreation: function (s) {
			return encodeURIComponent(s).replace(/\'/g, "%27");
		},
		buildLines: function (data) {
			var lines = [];
			for (var i = 0; i < data.length; i++) {
				for (var j = 0; j < data.length; j++) {
					if (data[i].Docnum === data[j].Docnuv) {
						lines.push({
							"from": data[i].id,
							"to": data[j].id
						})
					}
				}
			}
			this.getView().getModel("HeaderData").setProperty("/lines", lines);
		},
		onNodePress: function (oEvent) {
			var oPath = oEvent.getSource().getBindingContext("HeaderData").getPath();
			var oProcFlowData = this.getView().getModel("HeaderData").getProperty(oPath);
			var oDocNum = oProcFlowData.texts;
			var oDocType = oProcFlowData.lane;
			var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
			if (oDocType === "L" || oDocType === "C") {
				oCrossAppNavigator.toExternal({
					target: {
						semanticObject: "ZVA03",
						action: "display"
					},
					params: {
						"DocNum": oDocNum
					}
				});
			} else if (oDocType === "P" || oDocType === "N" || oDocType === "U") {
				oCrossAppNavigator.toExternal({
					target: {
						semanticObject: "ZVF03",
						action: "display"
					},
					params: {
						"DocNum": oDocNum
					}
				});
			} else if (oDocType === "+") {
				var oBukrs = oProcFlowData.Bukrs;
				var oGjahr = oProcFlowData.Gjahr;
				oCrossAppNavigator.toExternal({
					target: {
						semanticObject: "ZFB03",
						action: "display"
					},
					params: {
						"DocNum": oDocNum,
						"CompanyCode": oBukrs,
						"FiscalYear": oGjahr
					}
				});
			}

		},
		onNavigateToPricingApp: function (oEvent) {
			var oSelectedItem = oEvent.getSource().getParent().getParent().getSelectedItems();
			var oConditionTable = oSelectedItem[0].getBindingContext().getObject("ConditionTable");
			var ConditionType = oSelectedItem[0].getBindingContext().getObject("ConditionType");
			this.Vbeln = oEvent.getSource().getBindingContext().getObject().wrty_no;
			this.Auart = oEvent.getSource().getBindingContext().getObject().doc_type;
			var sPmprf = oEvent.getSource().getBindingContext().getObject().Pmprf;
			var sSubct = oEvent.getSource().getParent().getParent().getSelectedItem().getBindingContext().getObject().SubCategory;
			if (!this.Auart) {
				this.Auart = oSelectedItem[0].getBindingContext().getObject("Pmprf");
			}
			var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
			var sSemanticObject = "pricingmaintenance";
			var sAction = "manage";

			var sHash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
				target: {
					semanticObject: sSemanticObject,
					action: sAction
				},
				params: {
					"Pmprf": this.Auart,
					"Vbeln": this.Vbeln,
					"Kschl": ConditionType,
					"Kotab": oConditionTable
				}
			})) || "";
			var fixedURL = "#pricingmaintenance-manage&/xCGDCxI_PRICING_MAIN(Pmprf='" + sPmprf + "',Subct='"+sSubct+"',Counter=0)/toCondCat(Pmprf='" + sPmprf + "',Kschl='" +
			ConditionType + "',Kotab='" + oConditionTable + "',Subct='"+sSubct+"',Counter=0,Vbeln='',mganr='" + this.Vbeln + "',cc_docno='')";
			// var fixedURL = "#pricingmaintenance-manage&/xCGDCxI_PRICING_MAIN(Pmprf='" + sPmprf + "',Kschl='" + ConditionType + "',Kotab='" +
			// 	oConditionTable + "',Vbeln='',mganr='" + this.Vbeln + "')/toCondCat(Pmprf='" + sPmprf + "',Kschl='" +
			// 	ConditionType + "',Kotab='" + oConditionTable + "',Vbeln='',mganr='" + this.Vbeln + "')";
			window.location.href = window.location.href.split('#')[0] + fixedURL;

			// oCrossAppNavigator.toExternal({
			// 	target: {
			// 		semanticObject: "pricingmaintenance",
			// 		action: "manage"
			// 	},
			// 	params: {
			// 		"Pmprf": this.Auart,
			// 		"Vbeln": this.Vbeln,
			// 		"Kschl": ConditionType,
			// 		"Kotab": oConditionTable

			// 	}
			// });

		},
		showBusyIndicator: function () {
			if (!this._busyIndicator) {
				this._busyIndicator = new sap.m.BusyDialog({
					showCancelButton: false
				});
				this._busyIndicator.open();
			}
		},

		hideBusyIndicator: function () {
			if (this._busyIndicator) {
				this._busyIndicator.close();
				this._busyIndicator = null;
			}
		},
	});
});