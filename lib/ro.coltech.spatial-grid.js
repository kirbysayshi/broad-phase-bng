(function(exports){

	var SpatialGridTech = exports.coltech.SpatialGrid = function( minX, minY, maxX, maxY, cellSize ){
		this.entities = [];
	}

	SpatialGridTech.prototype.update = function(){}
	
	SpatialGridTech.prototype.addEntity = function( entity ){
		this.entities.push( entity );
	}
	
	SpatialGridTech.prototype.removeEntity = function( entity ){
		this.entities.splice( this.entities.indexOf(entity), 1 );
	}

	SpatialGridTech.prototype.queryForCollisionPairs = function(){

	}		

})(ro);