(function(exports){

	var BruteForceTech = exports.coltech.BruteForce = function(){
		this.entities = [];
	}

	BruteForceTech.prototype.update = ro.noop;

	BruteForceTech.prototype.addEntity = function( entity ){
		this.entities.push( entity );
	}

	BruteForceTech.prototype.removeEntity = function( entity ){
		this.entities.splice( this.entities.indexOf(entity), 1 );
	}

	BruteForceTech.prototype.queryForCollisionPairs = function(){

	}	

})(ro);