// Hierarchical Spatial Hash Grid: HSHG

// Extremely efficient spatial hashing for collision detection between 
// objects of any size and in infinite space! This is an implementation
// in JS as described in 
// http://www10.informatik.uni-erlangen.de/~schornbaum/hierarchical_hash_grids.pdf

// The only thing HSHG expects a collidable object to have is a getAABB() method that
// returns an object with two properties, min and max, that should both have a single
// array with two numbers as coordinates. For example, an object at 10, 10, 10 and
// height/width of 100 would return { min: [10, 10, 10], max: [110, 110, 110] }

// Usage: 
// var g = new HSHG();
// g.addObject( ... );

// every timestep:
// g.update();
// var pairs = g.queryForCollisionPairs(); // do something with these






// TODO: make the private vars configurable to the outside
// TODO: if an object's cell association changes, mark its previous association... be careful if the grid expands!
// TODO: be able to handle tunneling? use line-drawing to find crossed cells / objects, and mark the pair as sweep-necessary?

(function(root, undefined){

//---------------------------------------------------------------------
// GLOBAL FUNCTIONS
//---------------------------------------------------------------------

/**
 * Updates every object's position in the grid, but only if
 * the hash value for that object has changed.
 * This method DOES NOT take into account object expansion or
 * contraction, just position, and does not attempt to change 
 * the grid the object is currently in; it only (possibly) changes
 * the cell.
 *
 * If the object has significantly changed in size, the best bet is to
 * call removeObject() and addObject() sequentially, outside of the 
 * normal update cycle of HSHG.
 *
 * @return  void   desc
 */
function update_RECOMPUTE(){
		
	var i
		,obj
		,grid
		,meta
		,objAABB
		,newObjHash;
	
	// for each object
	for(i = 0; i < this._globalObjects.length; i++){
		obj = this._globalObjects[i];
		meta = obj.HSHG;
		grid = meta.grid;
		
		// recompute hash
		objAABB = obj.getAABB();
		newObjHash = grid.toHash(objAABB.min[0], objAABB.min[1]);
		
		if(newObjHash !== meta.hash){
			// grid position has changed, update!
			grid.removeObject(obj);
			grid.addObject(obj, newObjHash);
		} 
	}		
}

// not implemented yet :)
function update_REMOVEALL(){
	
}

function testAABBOverlap(objA, objB){
	var  a = objA.getAABB()
		,b = objB.getAABB();

	if(a.min[0] > b.max[0] || a.min[1] > b.max[1] || a.min[2] > b.max[2]
	|| a.max[0] < b.min[0] || a.max[1] < b.min[1] || a.max[2] < b.min[2]){
		return false;
	} else {
		return true;
	}
}

function getLongestAABBEdge(min, max){
	return Math.max(
		 Math.abs(max[0] - min[0])
		,Math.abs(max[1] - min[1])
		,Math.abs(max[2] - min[2])
	);
}

//---------------------------------------------------------------------
// ENTITIES
//---------------------------------------------------------------------

function HSHG(){
	
	this.MAX_OBJECT_CELL_DENSITY = 1/8 // objects / cells
	this.ONE_D_GRID_LENGTH = 16
	this.HIERARCHY_FACTOR = 2
	this.HIERARCHY_FACTOR_SQRT = Math.SQRT2
	this.UPDATE_METHOD = update_RECOMPUTE // or update_REMOVEALL
	
	this._grids = [];
	this._globalObjects = [];
}

//HSHG.prototype.init = function(){
//	this._grids = [];
//	this._globalObjects = [];
//}

HSHG.prototype.addObject = function(obj){
	var  x ,i
		,cellSize
		,objAABB = obj.getAABB()
		,objSize = getLongestAABBEdge(objAABB.min, objAABB.max)
		,oneGrid, newGrid;
	
	// for HSHG metadata
	obj.HSHG = {
		globalObjectsIndex: this._globalObjects.length
	};
	
	// add to global object array
	this._globalObjects.push(obj);
	
	if(this._grids.length == 0) {
		// no grids exist yet
		cellSize = objSize * this.HIERARCHY_FACTOR_SQRT;
		newGrid = new Grid(cellSize, this.ONE_D_GRID_LENGTH, this);
		newGrid.initCells();
		newGrid.addObject(obj);
		
		this._grids.push(newGrid);	
	} else {
		x = 0;

		// grids are sorted by cellSize, smallest to largest
		for(i = 0; i < this._grids.length; i++){
			oneGrid = this._grids[i];
			x = oneGrid.cellSize;
			if(objSize < x){
				x = x / this.HIERARCHY_FACTOR;
				if(objSize < x) {
					// find appropriate size
					while( objSize < x ) {
						x = x / this.HIERARCHY_FACTOR;
					}
					newGrid = new Grid(x * this.HIERARCHY_FACTOR, this.ONE_D_GRID_LENGTH, this);
					newGrid.initCells();
					// assign obj to grid
					newGrid.addObject(obj)
					// insert grid into list of grids directly before oneGrid
					this._grids.splice(i, 0, newGrid);
				} else {
					// insert obj into grid oneGrid
					oneGrid.addObject(obj);
				}
				return;
			}
		}
		
		while( objSize >= x ){
			x = x * this.HIERARCHY_FACTOR;
		}
		
		newGrid = new Grid(x, this.ONE_D_GRID_LENGTH, this);
		newGrid.initCells();
		// insert obj into grid
		newGrid.addObject(obj)
		// add newGrid as last element in grid list
		this._grids.push(newGrid);
	}
}

HSHG.prototype.removeObject = function(obj){
	var  meta = obj.HSHG
		,globalObjectsIndex
		,replacementObj;
	
	if(meta === undefined){
		throw Error( obj + ' was not in the HSHG.' );
		return;
	}
	
	// remove object from global object list
	globalObjectsIndex = meta.globalObjectsIndex
	if(globalObjectsIndex === this._globalObjects.length - 1){
		this._globalObjects.pop();
	} else {
		replacementObj = this._globalObjects.pop();
		replacementObj.HSHG.globalObjectsIndex = globalObjectsIndex;
		this._globalObjects[ globalObjectsIndex ] = replacementObj;
	}
	
	meta.grid.removeObject(obj);
	
	// remove meta data
	delete obj.HSHG;
}

HSHG.prototype.update = function(){
	this.UPDATE_METHOD.call(this);
}

HSHG.prototype.queryForCollisionPairs = function(broadOverlapTestCallback){
	
	var i, j, k, l, c
		,grid
		,cell
		,objA
		,objB
		,offset
		,adjacentCell
		,biggerGrid
		,objAAABB
		,objAHashInBiggerGrid
		,possibleCollisions = []
	
	// default broad test to internal aabb overlap test
	broadOverlapTest = broadOverlapTestCallback || testAABBOverlap;
	
	// for all grids ordered by cell size ASC
	for(i = 0; i < this._grids.length; i++){
		grid = this._grids[i];
		
		// for each cell of the grid that is occupied
		for(j = 0; j < grid.occupiedCells.length; j++){
			cell = grid.occupiedCells[j];
			
			// collide all objects within the occupied cell
			for(k = 0; k < cell.objectContainer.length; k++){
				objA = cell.objectContainer[k];
				for(l = k+1; l < cell.objectContainer.length; l++){
					objB = cell.objectContainer[l];
					if(broadOverlapTest(objA, objB) === true){
						possibleCollisions.push( [ objA, objB ] );
					}
				}
			}
			
			// for the first half of all adjacent cells, cell 13 is the "center" cell in 3D
			for(c = 0; c < 13; c++){
				offset = cell.neighborOffsetArray[c];
				
				//if(offset === null) { continue; }
				
				adjacentCell = grid.allCells[ cell.allCellsIndex + offset ];
				
				// collide all objects in cell with adjacent cell
				for(k = 0; k < cell.objectContainer.length; k++){
					objA = cell.objectContainer[k];
					for(l = 0; l < adjacentCell.objectContainer.length; l++){
						objB = adjacentCell.objectContainer[l];
						if(broadOverlapTest(objA, objB) === true){
							possibleCollisions.push( [ objA, objB ] );
						}
					}
				}
			}
		}
		
		// forall objects that are stored in this grid
		for(j = 0; j < grid.allObjects.length; j++){
			objA = grid.allObjects[j];
			objAAABB = objA.getAABB();
			
			// for all grids with cellsize larger than grid
			for(k = i + 1; k < this._grids.length; k++){
				biggerGrid = this._grids[k];
				objAHashInBiggerGrid = biggerGrid.toHash(objAAABB.min[0], objAAABB.min[1]);
				cell = biggerGrid.allCells[objAHashInBiggerGrid];
				
				// check objA against every object in all cells in offset array of cell
				// for all adjacent cells...
				for(c = 0; c < cell.neighborOffsetArray.length; c++){
					offset = cell.neighborOffsetArray[c];

					//if(offset === null) { continue; }

					adjacentCell = biggerGrid.allCells[ cell.allCellsIndex + offset ];
					
					// for all objects in the adjacent cell...
					for(l = 0; l < adjacentCell.objectContainer.length; l++){
						objB = adjacentCell.objectContainer[l];
						// test against object A
						if(broadOverlapTest(objA, objB) === true){
							possibleCollisions.push( [ objA, objB ] );
						}
					}
				}
			}
		}
	}
	
	// return list of object pairs
	return possibleCollisions;
}

/**
 * Draws an approximation of the HSHG
 * TODO: this is broken, it should draw a representation, not a visual approximation
 *
 * @param  2dContext ctx  desc
 * @param  array  startDim  the starting position to begin drawing
 * @param  array  endDim  the ending position to stop drawing
 * @return  void
 */
HSHG.prototype.drawGrid = function(ctx, startDim, endDim){
	var  gridCount = this._grids.length
		,i, j, k
		,grid
		,gridCellSize
		,rgb = [1, 1, 1];
	
	ctx.lineWidth = 1;
		
	for(i = 0; i < gridCount; i++){
		grid = this._grids[i];
		gridCellSize = grid.cellSize;
	
		ctx.beginPath();
		
		rgb[0] = 100;//30 * i;
		rgb[1] = 100;//255 * Math.random();
		rgb[2] = 100;//255 * Math.random();
		
		ctx.strokeStyle = 'rgba(' 
			+ ~~rgb[0] + ',' 
			+ ~~rgb[1] + ',' 
			+ ~~rgb[2] + ',0.2)';
		
		// x
		for(j = ~~(startDim[0] / gridCellSize); j < endDim[0]; j += gridCellSize){
			ctx.moveTo(j, startDim[1]);
			ctx.lineTo(j, endDim[1]);
		}
		
		// y
		for(j = ~~(startDim[1] / gridCellSize); j < endDim[1]; j += gridCellSize){
			ctx.moveTo(startDim[0], j);
			ctx.lineTo(endDim[0], j);
		}
		ctx.stroke();
	}	
}

HSHG.update_RECOMPUTE = update_RECOMPUTE;
HSHG.update_REMOVEALL = update_REMOVEALL;

/**
 * Grid
 *
 * @constructor
 * @param	int cellSize  the pixel size of each cell of the grid
 * @param	int cellCount  the total number of cells for the grid (width x height)
 * @param	HSHG parentHierarchy	the HSHG to which this grid belongs
 * @return  void
 */
function Grid(cellSize, oneDCellCount, parentHierarchy){
	this.cellSize = cellSize;
	this.inverseCellSize = 1/cellSize;
	this.oneDCellCount = oneDCellCount;
	this.xyzHashMask = this.oneDCellCount - 1;
	this.occupiedCells = [];
	this.allCells = Array(this.oneDCellCount*this.oneDCellCount*this.oneDCellCount);
	this.allObjects = [];
	this.sharedInnerOffsets = [];
	
	this._parentHierarchy = parentHierarchy || null;
}

Grid.prototype.indexToTuple = function(i, oneDCount){
	var  w = oneDCount
		,ww = w*w
		,z = ~~(i / ww)
		,y = ~~((i - ( z * ww )) / w)
		,x = ~~(i - ( z * ww ) - ( y * w));

	return { x: x, y: y, z: z }
}

Grid.prototype.tupleToOffset = function(t, oneDCount){
	var  xcom = t.x
		,ycom = t.y * oneDCount
		,zcom = t.z * oneDCount * oneDCount
	
	return xcom + ycom + zcom;
}

Grid.prototype.initCells = function(){
	
	var  self = this
		,i, j, x, y, z
		,tup
		,absTup
		,absIndex
		,cell
		,cellTup
		,onEdge
		,customOffsets
		,w = this.oneDCellCount // # of cells in one dimension of grid
		,ww = w*w // effectively the number of cells to +z 1 row
		,www = w*w*w // total cell count

		,rTupes = [
			{ x: -1, y: -1, z: -1 }, // 0
			{ x:  0, y: -1, z: -1 }, // 1
			{ x:  1, y: -1, z: -1 }, // 2

			{ x: -1, y:  0, z: -1 }, // 3
			{ x:  0, y:  0, z: -1 }, // 4
			{ x:  1, y:  0, z: -1 }, // 5

			{ x: -1, y:  1, z: -1 }, // 6
			{ x:  0, y:  1, z: -1 }, // 7
			{ x:  1, y:  1, z: -1 }, // 8

			{ x: -1, y: -1, z:  0 }, // 9
			{ x:  0, y: -1, z:  0 }, // 10
			{ x:  1, y: -1, z:  0 }, // 11

			{ x: -1, y:  0, z:  0 }, // 12
			{ x:  0, y:  0, z:  0 }, // 13
			{ x:  1, y:  0, z:  0 }, // 14

			{ x: -1, y:  1, z:  0 }, // 15
			{ x:  0, y:  1, z:  0 }, // 16
			{ x:  1, y:  1, z:  0 }, // 17

			{ x: -1, y: -1, z:  1 }, // 18
			{ x:  0, y: -1, z:  1 }, // 19
			{ x:  1, y: -1, z:  1 }, // 20

			{ x: -1, y:  0, z:  1 }, // 21
			{ x:  0, y:  0, z:  1 }, // 22
			{ x:  1, y:  0, z:  1 }, // 23

			{ x: -1, y:  1, z:  1 }, // 24
			{ x:  0, y:  1, z:  1 }, // 25
			{ x:  1, y:  1, z:  1 }, // 26
		]

		,sharedOffsets = rTupes.map(function(t){ return self.tupleToOffset(t, w) });

	this.sharedInnerOffsets = sharedOffsets;
	
	// init all cells, creating offset arrays as needed
	for(i = 0; i < www; i++){
		onEdge = false;
		cellTup = self.indexToTuple(i, w);
		x = cellTup.x;
		y = cellTup.y;
		z = cellTup.z;

		cell = new Cell();
		cell.allCellsIndex = i;
		this.allCells[i] = cell;
		
		// http://jsperf.com/modulo-vs-and-for-cell-tests
		if( 
			// right or left edge cell
			(x+1) % w === 0 
			|| x % w === 0
			
			// top or bottom edge cell	
			|| (y+1) % w === 0
			|| y % w === 0
		
			// front or back edge cell
			|| (z+1) % w === 0
			|| z % w === 0
		){
			
			cell.neighborOffsetArray = [];

			// foreach rTup
			for(j = 0; j < rTupes.length; j++){
				tup = rTupes[j];

				// absolute tuplet for adjacent cell
				absTup = {
					 x: tup.x + cellTup.x
					,y: tup.y + cellTup.y
					,z: tup.z + cellTup.z
				}
				
				// correct absTup for < 0 || == w
				if(absTup.x > w - 1) absTup.x = 0;
				if(absTup.x < 0) absTup.x = w - 1;
				
				if(absTup.y > w - 1) absTup.y = 0;
				if(absTup.y < 0) absTup.y = w - 1;
				
				if(absTup.z > w - 1) absTup.z = 0;
				if(absTup.z < 0) absTup.z = w - 1;
				
				// convert absTup to index
				absIndex = self.tupleToOffset(absTup, w);
				cell.neighborOffsetArray.push( absIndex - i );
			}	

		} else {
			// use shared offsets
			cell.neighborOffsetArray = sharedOffsets;
		}
	}
}

Grid.prototype.toHash = function(x, y, z){
	var i, xHash, yHash, zHash;
	
	if(x < 0){
		i = (-x) * this.inverseCellSize;
		xHash = this.oneDCellCount - 1 - ( ~~i & this.xyzHashMask );
	} else {
		i = x * this.inverseCellSize;
		xHash = ~~i & this.xyzHashMask;
	}
	
	if(y < 0){
		i = (-y) * this.inverseCellSize;
		yHash = this.oneDCellCount - 1 - ( ~~i & this.xyzHashMask );
	} else {
		i = y * this.inverseCellSize;
		yHash = ~~i & this.xyzHashMask;
	}
	
	if(z < 0){
		i = (-z) * this.inverseCellSize;
		zHash = this.oneDCellCount - 1 - ( ~~i & this.xyzHashMask );
	} else {
		i = z * this.inverseCellSize;
		zHash = ~~i & this.xyzHashMask;
	}

	return xHash + yHash * this.oneDCellCount 
		+ zHash * this.oneDCellCount * this.oneDCellCount;
}

Grid.prototype.addObject = function(obj, hash){
	var  objAABB
		,objHash
		,targetCell;
	
	// technically, passing this in this should save some computational effort when updating objects
	if(hash !== undefined){
		objHash = hash;
	} else {
		objAABB = obj.getAABB()
		objHash = this.toHash(objAABB.min[0], objAABB.min[1])
	}
	targetCell = this.allCells[objHash];
	
	if(targetCell.objectContainer.length === 0){
		// insert this cell into occupied cells list
		targetCell.occupiedCellsIndex = this.occupiedCells.length;
		this.occupiedCells.push(targetCell);
	}
	
	// add meta data to obj, for fast update/removal
	obj.HSHG.objectContainerIndex = targetCell.objectContainer.length;
	obj.HSHG.hash = objHash;
	obj.HSHG.grid = this;
	obj.HSHG.allGridObjectsIndex = this.allObjects.length;
	// add obj to cell
	targetCell.objectContainer.push(obj);
	
	// we can assume that the targetCell is already a member of the occupied list
	
	// add to grid-global object list
	this.allObjects.push(obj);
	
	// do test for grid density
	if(this.allObjects.length / this.allCells.length > this._parentHierarchy.MAX_OBJECT_CELL_DENSITY){
		// grid must be increased in size
		this.expandGrid();
	}
}

Grid.prototype.removeObject = function(obj){
	var  meta = obj.HSHG
		,hash
		,containerIndex
		,allGridObjectsIndex
		,cell
		,replacementCell
		,replacementObj;
	
	hash = meta.hash;
	containerIndex = meta.objectContainerIndex;
	allGridObjectsIndex = meta.allGridObjectsIndex;
	cell = this.allCells[hash];
	
	// remove object from cell object container
	if(cell.objectContainer.length === 1){
		// this is the last object in the cell, so reset it
		cell.objectContainer.length = 0;	
		
		// remove cell from occupied list
		if(cell.occupiedCellsIndex === this.occupiedCells.length - 1){
			// special case if the cell is the newest in the list
			this.occupiedCells.pop();
		} else {
			replacementCell = this.occupiedCells.pop();
			replacementCell.occupiedCellsIndex = cell.occupiedCellsIndex;
			this.occupiedCells[ cell.occupiedCellsIndex ] = replacementCell;
		}
		
		cell.occupiedCellsIndex = null;
	} else {
		// there is more than one object in the container
		if(containerIndex === cell.objectContainer.length - 1){
			// special case if the obj is the newest in the container
			cell.objectContainer.pop();
		} else {
			replacementObj = cell.objectContainer.pop();
			replacementObj.HSHG.objectContainerIndex = containerIndex;
			cell.objectContainer[ containerIndex ] = replacementObj;
		}
	}
	
	// remove object from grid object list
	if(allGridObjectsIndex === this.allObjects.length - 1){
		this.allObjects.pop();
	} else {
		replacementObj = this.allObjects.pop();
		replacementObj.HSHG.allGridObjectsIndex = allGridObjectsIndex;
		this.allObjects[ allGridObjectsIndex ] = replacementObj;
	}
}

Grid.prototype.expandGrid = function(){
	var  i, j
		,currentCellCount = this.allCells.length
		,currentOneDCellCount = this.oneDCellCount
		,currentXYZHashMask = this.xyzHashMask
		
		,newOneDCellCount = this.oneDCount * 2
		,newCellCount = newOneDCellCount * newOneDCellCount * newOneDCellCount
		
		,newXYZHashMask = newOneDCellCount - 1
		,allObjects = this.allObjects.slice(0) // duplicate array, not objects contained
		,aCell
		,push = Array.prototype.push;
	
	// remove all objects
	for(i = 0; i < allObjects.length; i++){
		this.removeObject(allObjects[i]);
	}
	
	// reset grid values, set new grid to be 4x larger than last
	this.oneDCellCount = newOneDCellCount;
	this.allCells = Array(newCellCount);
	this.xyzHashMask = newXYZHashMask;
	
	// initialize new cells
	this.initCells();
	
	// re-add all objects to grid
	for(i = 0; i < allObjects.length; i++){
		this.addObject(allObjects[i]);
	}
}

/**
 * A cell of the grid
 *
 * @constructor
 * @return  void   desc
 */
function Cell(){
	this.objectContainer = [];
	this.neighborOffsetArray;
	this.occupiedCellsIndex = null;
	this.allCellsIndex = null;
}

//---------------------------------------------------------------------
// EXPORTS
//---------------------------------------------------------------------

root['HSHG'] = HSHG;
HSHG._private = {
	Grid: Grid,
	Cell: Cell,
	testAABBOverlap: testAABBOverlap,
	getLongestAABBEdge: getLongestAABBEdge
};

})(this);
