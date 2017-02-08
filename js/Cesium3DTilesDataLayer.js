/*
 * 3DCityDB-Web-Map
 * http://www.3dcitydb.org/
 * 
 * Copyright 2015 - 2016
 * Chair of Geoinformatics
 * Technical University of Munich, Germany
 * https://www.gis.bgu.tum.de/
 * 
 * The 3DCityDB-Web-Map is jointly developed with the following
 * cooperation partners:
 * 
 * virtualcitySYSTEMS GmbH, Berlin <http://www.virtualcitysystems.de/>
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 *     
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function() {
	function Cesium3DTilesDataLayer(options){	
		
		var proxyUrl;
		if (location.host.indexOf('8000') > -1) {
			proxyUrl = '/proxy/'
		}
		else {
			proxyUrl = location.protocol + '//' + location.host + '/proxy/'
		}
		this._defaultProxy = new Cesium.DefaultProxy(proxyUrl)
		
		this._url = options.url;
		this._name = options.name;
		this._id = Cesium.defaultValue(options.id, Cesium.createGuid());		
		this._region = options.region;
		this._active = Cesium.defaultValue(options.active, true);
		this._highlightedObjects = {};		
		this._hiddenObjects = [];
		this._cameraPosition = {};
		this._thematicDataUrl = Cesium.defaultValue(options.thematicDataUrl, "");
		this._thematicDataProvider = Cesium.defaultValue(options.thematicDataProvider, "");
		this._cesiumViewer = undefined;
		this._tileset = undefined;		
		
		this._highlightColor = new Cesium.Color(0.4, 0.4, 0.0, 1.0);
		this._mouseOverhighlightColor = new Cesium.Color(0.0, 0.3, 0.0, 1.0);
		
		this._configParameters = {
			"id": this.id,
			"name" : this.name,
			"url" : this.url,
			"thematicDataUrl" : this.thematicDataUrl,
			"thematicDataProvider" : this._thematicDataProvider
		}
	
		/**
		 * handles ClickEvents
		 */
		this._clickEvent = new Cesium.Event();
		
		this._ctrlClickEvent = new Cesium.Event();
		
		/**
		 * handles ClickEvents
		 */
		this._mouseInEvent = new Cesium.Event();
		
		/**
		 * handles ClickEvents
		 */
		this._mouseOutEvent = new Cesium.Event();
		
		this._startLoadingEvent = new Cesium.Event();
		
		this._finishLoadingEvent = new Cesium.Event();
		
		this._viewChangedEvent = new Cesium.Event();
		
		Cesium.knockout.track(this, ['_highlightedObjects', '_hiddenObjects']);
	}

	Object.defineProperties(Cesium3DTilesDataLayer.prototype, {
	    /**
	     * Gets the active 
	     */
	    active : {
	        get : function(){
	        	return this._active;
	        }
	    },
	    /**
	     * Gets the currently highlighted Objects as an array
	     */
	    highlightedObjects : {
	        get : function(){
	        	return this._highlightedObjects;
	        },
	        set : function(value){
	        	this._highlightedObjects = value;
	        }	    
	    },
	    /**
	     * Gets the currently hidden Objects as an array
	     */
	    hiddenObjects : {
	        get : function(){
	        	return this._hiddenObjects;
	        },
	        set : function(value){
	        	this._hiddenObjects = value;
	        }	
	    },
	    /**
	     * Gets/Sets the CameraPosition.
	     */
	    cameraPosition : {
	        get : function(){
	        	return this._cameraPosition;
	        },
	        set : function(value){
	        	this._cameraPosition = value;
	        }
	    },
	    /**
	     * Gets the url of the datasource
	     */
	    url : {
	        get : function(){
	        	return this._url;
	        },
	        set : function(value){
	        	this._url = value;
	        }
	    },
	    /**
	     * Gets the name of this datasource.
	     */
	    name : {
	        get : function(){
	        	return this._name;
	        },
	        set : function(value){
	        	this._name = value;
	        }
	    },
	    /**
	     * Gets the id of this datasource, the id should be unique.
	     */
	    id : {
	        get : function(){
	        	return this._id;
	        },
	        set : function(value){
	        	this._id = value;
	        }
	    },
	    /**
	     * Gets boundingbox of this layer as an Cesium Rectangle Object with longitude/latitude values in radians. 
	     */
	    region : {
	        get : function(){
	        	return this._region;
	        }
	    },
	    
	    thematicDataUrl : {
	        get : function(){
	        	return this._thematicDataUrl;
	        },
	        set : function(value){
	        	this._thematicDataUrl = value;
	        }
	    },
	    
	    thematicDataProvider : {
	        get : function(){
	        	return this._thematicDataProvider;
	        },
	        set : function(value){
	        	this._thematicDataProvider = value;
	        }
	    },
	    
	    highlightColor : {
	        get : function(){
	        	return this._highlightColor;
	        },
	        set : function(value){
	        	this._highlightColor = value;
	        }
	    },
	    
	    mouseOverhighlightColor : {
	        get : function(){
	        	return this._mouseOverhighlightColor;
	        },
	        set : function(value){
	        	this._mouseOverhighlightColor = value;
	        }
	    },
	    
	    configParameters : {
	        get : function(){
	        	return this._configParameters;
	        }
	    }
	});

	/**
	 * adds this layer to the given Cesium viewer
	 * @param {CesiumViewer} cesiumViewer
	 */
	Cesium3DTilesDataLayer.prototype.addToCesium = function(cesiumViewer){
		var that = this;
		this._cesiumViewer = cesiumViewer;
		
		this._startLoadingEvent.raiseEvent(this);		
		this._tileset = new Cesium.Cesium3DTileset({
		    url : this._url
		});

		this._tileset.readyPromise.then(function(tileset) {
			if (that._active) {				
				cesiumViewer.scene.primitives.add(tileset);
            }			
			that._finishLoadingEvent.raiseEvent(that);	
			that.registerTilesLoadedEventHandler();
			that.registerMouseEventHandlers();
		});
	}
	
	Cesium3DTilesDataLayer.prototype.registerTilesLoadedEventHandler = function(){
		var scope = this;
		var timer = null;
		this._tileset.allTilesLoaded.addEventListener(function() {
			updater();
			function updater() {
				if (timer != null)
					clearTimeout(timer);
				
				timer = setTimeout(function(){
					var loadedTiles = scope._tileset._selectedTiles;
					for (var i = 0; i < loadedTiles.length; i++) {
						if (loadedTiles[i]._content.constructor.name == 'Empty3DTileContent')
							continue;
						var features = loadedTiles[i]._content._features;
						var featuresLength = loadedTiles[i]._content.featuresLength;
						for (var k = 0; k < featuresLength; k++) {
							if (Cesium.defined(features)) {
								var object = features[k];
								if (Cesium.Color.equals(object.color, scope._highlightColor)) {
									scope.unHighlightObject(object);
								}
							}
						}				
					}
					scope.highlight(scope.highlightedObjects);
					scope.hideObjects(scope.hiddenObjects);
					updater();
				}, 1000);
			} 				
		});
	}
	
	Cesium3DTilesDataLayer.prototype.registerMouseEventHandlers = function(){
		var highlightColor = this._highlightColor;
		var mouseOverhighlightColor = this._mouseOverhighlightColor;
		
		var scope = this;
		scope.registerEventHandler("CLICK", function(object) {	
			var objectId = object._batchTable.batchTableJson.id[object._batchId];
			console.log (objectId);
			
	 		if (scope.isInHighlightedList(objectId))
				return; 
	 		
	 	    // clear all other Highlighting status and just highlight the clicked object...
	 		scope.unHighlightAllObjects();  									
			var highlightThis = {};
			
			highlightThis[objectId] = highlightColor;
			scope.highlight(highlightThis); 						
		});
		
		// CtrlclickEvent Handler for Multi-Selection and Highlighting...
		scope.registerEventHandler("CTRLCLICK", function(object) {
			var objectId = object._batchTable.batchTableJson.id[object._batchId];
	 		
			if (scope.isInHighlightedList(objectId)) {
				scope.unHighlight([objectId]);
			}else {
				var highlightThis = {};				
				highlightThis[objectId] = highlightColor;
				scope.highlight(highlightThis); 
			}								
		});
		
		scope.registerEventHandler("MOUSEIN", function(object) {			
			var objectId = object._batchTable.batchTableJson.id[object._batchId];
			
			if (scope.isInHighlightedList(objectId))
				return;
			
			object.setProperty("originalColorValue", Cesium.Color.clone(object.color));
			object.color = mouseOverhighlightColor;
		});
		
		scope.registerEventHandler("MOUSEOUT", function(object) {
			var objectId = object._batchTable.batchTableJson.id[object._batchId];
			
			if (scope.isInHighlightedList(objectId))
				return;
			
			try{
				var originalColor = object.getProperty("originalColorValue");
				object.color = originalColor;				
			}
			catch(e){return;} 			
		});	
	}
		
	Cesium3DTilesDataLayer.prototype.zoomToStartPosition = function(){
		this._cesiumViewer.scene.camera.flyToBoundingSphere(this._tileset.boundingVolume._boundingSphere);
	}

	/**
	 * adds this layer to the given cesium viewer
	 * @param {CesiumViewer} cesiumViewer
	 */
	Cesium3DTilesDataLayer.prototype.removeFromCesium = function(cesiumViewer){
		this.activate(false);
	}

	/**
	 * activates the lay
	 * @param {Boolean} value
	 */
	Cesium3DTilesDataLayer.prototype.activate = function(active){			
		this._tileset.show = active;		
		this._active = active;
	}
	
	/**
	 * deactivates the layer
	 * @param undefined
	 */
	Cesium3DTilesDataLayer.prototype.reActivate = function(){
		var that = this;
		var deferred = Cesium.when.defer();
		if (this._active) {		
			this._highlightedObjects = {};
			this._hiddenObjects = [];
			this._cesiumViewer.scene.primitives.remove(this._tileset);				
		}
		
		this._startLoadingEvent.raiseEvent(this);		
		this._tileset = new Cesium.Cesium3DTileset({
		    url : this._url
		});

		this._tileset.readyPromise.then(function(tileset) {			
			that._cesiumViewer.scene.primitives.add(tileset);			
			that._finishLoadingEvent.raiseEvent(that);
			that.registerTilesLoadedEventHandler();
			deferred.resolve();
		});
		
		return deferred.promise;
	}	
		
	/**
	 * highlights one or more object with a given color;
	 */
	Cesium3DTilesDataLayer.prototype.highlight = function(toHighlight){
		for (var id in toHighlight){
			this._highlightedObjects[id] = toHighlight[id];
			var objects = this.getObjectById(id);
			for (var i = 0; i < objects.length; i++) {
				this.highlightObject(objects[i]);
			}				
		}	
		this._highlightedObjects = this._highlightedObjects;
	
	}
	
	Cesium3DTilesDataLayer.prototype.highlightObject = function(object){
		if (object == null)
			return;
		
		var objectId = object._batchTable.batchTableJson.id[object._batchId];		
		var highlightColor = this._highlightedObjects[objectId];
		if (highlightColor) {
			if (!Cesium.defined(object.getProperty("originalColorValue"))) {
				object.setProperty("originalColorValue", Cesium.Color.clone(object.color));
			}			
			object.color = highlightColor;
		}	
	};
	
	Cesium3DTilesDataLayer.prototype.getObjectById = function(objectId){
		var objects = [];
		var loadedTiles = this._tileset._selectedTiles;
		for (var i = 0; i < loadedTiles.length; i++) {
			if (loadedTiles[i]._content.constructor.name == 'Empty3DTileContent')
				continue;
			var batchTableMemberIds = loadedTiles[i]._content.batchTable.batchTableJson.id;
			var index = batchTableMemberIds.indexOf(objectId);
			if (index > -1 && Cesium.defined(loadedTiles[i]._content._features)) {
				var object = loadedTiles[i]._content._features[index];
				objects.push(object);
			}
		}
		return objects;
	};

	/**
	 * undo highlighting
	 */
	Cesium3DTilesDataLayer.prototype.unHighlight = function(toUnHighlight){
		for (var k = 0; k < toUnHighlight.length; k++){	
			var id = toUnHighlight[k];			
			delete this._highlightedObjects[id];		
		}
		for (var k = 0; k < toUnHighlight.length; k++){	
			var id = toUnHighlight[k];	
			var objects = this.getObjectById(id);
			for (var i = 0; i < objects.length; i++) {
				this.unHighlightObject(objects[i]);
			}			
		}
		this._highlightedObjects = this._highlightedObjects;
	}
	
	Cesium3DTilesDataLayer.prototype.unHighlightObject = function(object){
		var originalColor = object.getProperty("originalColorValue");
		object.color = originalColor;
	};	

	/**
	 * hideObjects
	 */
	Cesium3DTilesDataLayer.prototype.hideObjects = function(toHide){
		for (var i = 0; i < toHide.length; i++){
			var objectId = toHide[i];
			if (!this.isInHiddenList(objectId)) {
				this._hiddenObjects.push(objectId);
			}			
			var objects = this.getObjectById(objectId);
			for (var k = 0; k < objects.length; k++) {
				this.hideObject(objects[k]);
			}				
		}
		this._hiddenObjects = this._hiddenObjects;
	}
	
	Cesium3DTilesDataLayer.prototype.hideObject = function(object){
		object.show = false;
	};
	
	Cesium3DTilesDataLayer.prototype.isInHiddenList = function(objectId){	
		return this._hiddenObjects.indexOf(objectId) > -1? true: false;
	};
	
	Cesium3DTilesDataLayer.prototype.hasHiddenObjects = function(){	
		return this._hiddenObjects.length > 0? true : false;
	};
	
	Cesium3DTilesDataLayer.prototype.isHiddenObject = function(object){
		return object.show? false: true;
	};
	
	Cesium3DTilesDataLayer.prototype.showAllObjects = function(){
		for (var k = 0; k < this._hiddenObjects.length; k++){	
			var objectId = this._hiddenObjects[k];	
			var objects = this.getObjectById(objectId);
			for (var i = 0; i < objects.length; i++) {
				this.showObject(objects[i]);
			}			
		}
		this._hiddenObjects = this._hiddenObjects;		
		this._hiddenObjects = [];
	};

	Cesium3DTilesDataLayer.prototype.showObjects = function(toUnhide){		
		for (var k = 0; k < toUnhide.length; k++){	
			var objectId = toUnhide[k];			
			this._hiddenObjects.splice(objectId, 1);	
		}
		for (var k = 0; k < toUnhide.length; k++){	
			var objectId = toUnhide[k];			
			var objects = this.getObjectById(objectId);
			for (var i = 0; i < objects.length; i++) {
				this.showObject(objects[i]);
			}			
		}
		this._hiddenObjects = this._hiddenObjects;	
	}
	
	Cesium3DTilesDataLayer.prototype.showObject = function(object){		
		object.show = true;
	}
	
	Cesium3DTilesDataLayer.prototype.unHighlightAllObjects = function(){
		for (var id in this._highlightedObjects){
			delete this._highlightedObjects[id];
			var objects = this.getObjectById(id);
			for (var i = 0; i < objects.length; i++) {
				this.unHighlightObject(objects[i]);
			}				
		}
		this._highlightedObjects = this._highlightedObjects;
	};

	Cesium3DTilesDataLayer.prototype.isInHighlightedList = function(objectId){
		return this._highlightedObjects.hasOwnProperty(objectId);
	};
	
	/**
	 * removes an Eventhandler
	 * @param {String} event (either CLICK, MOUSEIN or MOUSEOUT)
	 */	
	Cesium3DTilesDataLayer.prototype.removeEventHandler = function(event, callback){
		if(event == "CLICK"){
			this._clickEvent.removeEventListener(callback, this);
		}else if(event == "CTRLCLICK"){
			this._ctrlClickEvent.removeEventListener(callback, this);
		}else if(event == "MOUSEIN"){
			this._mouseInEvent.removeEventListener(callback, this);
		}else if(event == "MOUSEOUT"){
			this._mouseOutEvent.removeEventListener(callback, this);
		}else if(event == "STARTLOADING"){
			this._startLoadingEvent.removeEventListener(callback, this);
		}else if(event == "FINISHLOADING"){
			this._finishLoadingEvent.removeEventListener(callback, this);
		}else if(event == "VIEWCHANGED"){
			this._viewChangedEvent.removeEventListener(callback, this);
		}
	}

	/**
	 * adds an Eventhandler
	 * @param {String} event (either CLICK, MOUSEIN or MOUSEOUT)
	 * @return {String} id of the event Handler, can be used to remove the event Handler
	 */
	Cesium3DTilesDataLayer.prototype.registerEventHandler = function(event, callback){
		if(event == "CLICK"){
			this._clickEvent.addEventListener(callback, this);
		}else if(event == "CTRLCLICK"){
			this._ctrlClickEvent.addEventListener(callback, this)
		}else if(event == "MOUSEIN"){
			this._mouseInEvent.addEventListener(callback, this);
		}else if(event == "MOUSEOUT"){
			this._mouseOutEvent.addEventListener(callback, this);
		}else if(event == "STARTLOADING"){
			this._startLoadingEvent.addEventListener(callback, this);
		}else if(event == "FINISHLOADING"){
			this._finishLoadingEvent.addEventListener(callback, this);
		}else if(event == "VIEWCHANGED"){
			this._viewChangedEvent.addEventListener(callback, this);
		}
	}

	/**
	 * triggers an Event
	 * @param {String} event (either CLICK, MOUSEIN or MOUSEOUT)
	 * @param {*} arguments, any number of arguments
	 */
	Cesium3DTilesDataLayer.prototype.triggerEvent = function(event, object){
		if(event == "CLICK"){
			this._clickEvent.raiseEvent(object);
		}else if(event == "CTRLCLICK"){
			this._ctrlClickEvent.raiseEvent(object);
		}else if(event == "MOUSEIN"){
			this._mouseInEvent.raiseEvent(object);
		}else if(event == "MOUSEOUT"){
			this._mouseOutEvent.raiseEvent(object);
		}else if(event == "VIEWCHANGED"){
			this._viewChangedEvent.raiseEvent(object);
		}
	}
	window.Cesium3DTilesDataLayer = Cesium3DTilesDataLayer;
})();
