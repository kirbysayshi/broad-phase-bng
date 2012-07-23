var bng = {};

bng.world = new ro.World( 'ro-canvas', {

     coltech: new ro.coltech.BruteForce()

    // called at the end of ro.World constructor
    ,init: function(){
    
        var  count = 15
            ,radius = this.screen.size.y / 2 * 2/3 // 2/3rds of half of the height
            ,width = 30
            ,height = 30
            ,offsetX = this.screen.size.x/2 - width/2
            ,offsetY = this.screen.size.y/2 - height/2
            ,i
            ,box
            ,angle;
        
        this.movingBox = new ro.Entity( offsetX, offsetY, width, height );
        this.movingBox.period = 0;
        this.movingBox.radius = radius;
        this.addEntity( this.movingBox );

        for(i = 0; i < count; i++){
            // compute angle to evenly space out boxes
            angle = (i/count) * Math.PI*2;
            box = new ro.Entity(
                 Math.cos(angle) * radius + offsetX
                ,Math.sin(angle) * radius + offsetY
                ,width, height );
            this.addEntity( box );
        }
    }

    // called at each update step
    ,update: function(){

        var  entityLen = this.entities.length
        	,offsetX = this.screen.size.x/2 - this.movingBox.size.x/2
            ,offsetY = this.screen.size.y/2 - this.movingBox.size.y/2

        // move the box around the circle
        this.movingBox.period += 0.02;
        this.movingBox.pos.x = Math.cos( this.movingBox.period ) * this.movingBox.radius + offsetX;
        this.movingBox.pos.y = Math.sin( this.movingBox.period ) * this.movingBox.radius + offsetY;
    }
    
    ,handleCollisions: function(dt, collisionList){
    	
    	var i, pair, objA, objB;

    	for(i = 0; i < collisionList.length; i++){
    		pair = collisionList[i];
    		objA = pair[0];
    		objB = pair[1];

    		objA.draw( dt, ro.colors.kred05 );
    		objB.draw( dt, ro.colors.kred05 );
    	}

    }
});

document.addEventListener( 'keydown', function(e){
    if(e.which == 27){ // escape

        if(bng.world.isRunning === true){
            bng.world.stop();
        } else {
            bng.world.start();
        }

    }
}, false );