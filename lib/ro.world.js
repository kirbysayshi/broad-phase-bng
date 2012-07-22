(function(exports){

	var World = exports.World = function(canvasId, scale, broadPhase, mainLoop){
		this.main = mainLoop || this.step;
		this.mainHandle = null;
		this.broadPhase = broadPhase || this.bruteForce;

		this.entities = [];
		this.uniq = 0;

		this.screen = new Screen( document.getElementById(canvasId), scale );
	}

	World.prototype.step = function(dt){

		var i, entity, screen = this.screen;

		screen.ctx.fillRect( 0, 0, screen.realSize.x, screen.realSize.y );

		for(i = 0; i < this.entities.length; i++){
			entity = this.entities[ i ];
			entity.accelerate(dt);
			entity.updateAABB();
		}

		// do collision stuff

		for(i = 0; i < this.entities.length; i++){
			entity = this.entities[ i ];
			entity.inertia(dt);
			entity.updateAABB();
			entity.draw();
		}		

	}

	World.prototype.run = function(main){

		var func = this.main = function(dt){
			var handle = window.requestAnimationFrame( func );
			mainFunc(dt);
			return handle;
		};
		
		this.mainHandle = func();
	}

	World.prototype.stop = function(){
		window.cancelAnimationFrame( this.mainHandle );
	}

	World.prototype.addEntity = function(entity){
		entity._roId = this.uniq++;
		entity.world = this;
		this.entities.push( entity );
	}

})(ro)