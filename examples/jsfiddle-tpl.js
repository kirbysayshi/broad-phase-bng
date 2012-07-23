
var bng = {};

bng.world = new ro.World( 'ro-canvas', {

	 coltech: new ro.coltech.BruteForce()
	,scale: 1

	// called at the end of ro.World constructor
    ,init: function(){}

    // called at each update step
    ,update: function(){}
    
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