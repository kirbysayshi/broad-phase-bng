(function(exports){

	var HSHGTech = exports.coltech.HierarchicalSpatialHashGrid = function(){
		this.hshg = new HSHG();

		// these are just shortcuts
		this.addEntity = this.hshg.addObject;
		this.removeEntity = this.hshg.removeObject;
		this.queryForCollisionPairs = this.hshg.queryForCollisionPairs;
	}

	HSHGTech.prototype.update = function(world){
		this.hshg.update();
	}

	/*
	HSHGTech.prototype.addEntity = function( entity ){
		this.hshg.addObject( entity );
	}
	
	HSHGTech.prototype.removeEntity = function( entity ){
		this.hshg.removeObject( entity );
	}

	HSHGTech.prototype.queryForCollisionPairs = function(){
		return this.hshg.queryForCollisionPairs();
	}*/

})(ro);