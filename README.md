
## Broad Phase Collision Detection Using Spatial Partitioning

# Two Approaches to Broad Phase Collision Detection Using Spatial Partitioning

<link href="file:///Users/drew/Dropbox/js/broad-phase-bng/style/styles.css" rel="stylesheet" type="text/css" />
<canvas id="ro-canvas" width="546" height="410"></canvas>

<!--
<script type="text/javascript" src="https://raw.github.com/kirbysayshi/broad-phase-bng/master/vendor/Stats.js"></script>

<script type="text/javascript" src="https://raw.github.com/kirbysayshi/broad-phase-bng/master/lib/ro.js"></script>
<script type="text/javascript" src="https://raw.github.com/kirbysayshi/broad-phase-bng/master/lib/ro.math.js"></script>
<script type="text/javascript" src="https://raw.github.com/kirbysayshi/broad-phase-bng/master/lib/ro.world.js"></script>
<script type="text/javascript" src="https://raw.github.com/kirbysayshi/broad-phase-bng/master/lib/ro.coltech.brute-force.js"></script>
<script type="text/javascript" src="https://raw.github.com/kirbysayshi/broad-phase-bng/master/lib/ro.coltech.hshg.js"></script>
<script type="text/javascript" src="https://raw.github.com/kirbysayshi/broad-phase-bng/master/lib/ro.coltech.spatial-grid.js"></script>
<script type="text/javascript" src="https://raw.github.com/kirbysayshi/broad-phase-bng/master/lib/ro.screen.js"></script>
<script type="text/javascript" src="https://raw.github.com/kirbysayshi/broad-phase-bng/master/lib/ro.entity.js"></script>
<script type="text/javascript" src="https://raw.github.com/kirbysayshi/broad-phase-bng/master/lib/ro.input.js"></script>

<script type="text/javascript" src="https://raw.github.com/kirbysayshi/broad-phase-bng/master/examples/bruteforce/orbit-01.js"></script>
-->

<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/vendor/Stats.js"></script>

<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/vendor/hshg3d.js"></script>
<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.js"></script>
<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.math.js"></script>
<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.world.js"></script>
<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.coltech.brute-force.js"></script>
<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.coltech.hshg.js"></script>
<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.coltech.spatial-grid.js"></script>
<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.screen.js"></script>
<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.entity.js"></script>
<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.input.js"></script>

<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/examples/benches/spatialgrid.js"></script>

## What is Broad-Phase Collision Detection?

Collision detection is an ongoing source of research and constant optimization in game development. It can be a source of exuberance or nearly infinite frustration. Rolling your own is typically the best way to make sure your game is never finished!

However, knowing what an engine does internally to make your life easier is extremely beneficial to you as a developer. In addition to increasing your knowledge and understanding, it also helps you appreciate the hard work wrought by the giants whose shoulders you're standing on.

Collision detection is typically performed in two phases: _broad phase_ and _narrrow phase_. 

Broad phase detection is typically a computationally low cost operation that quickly answers the question, "Which objects have a strong possibility of colliding?" Approaches include [Sweep and Prune][], and [Spatial Partitioning][]: the latter is the focus of this article.

Narrow phase is the fine grained, "What part of object A colided with object B?" step. It is typically computationally intense, and thus cannot be performed on every pair of objects in the time between game updates (e.g. the next drawn frame). Examples of narrow phase techniques are the [Hyperplane Separation Theorem][] (also known as the Separating Axis Theorem) [^1], [Pixel Perfect Collision Detection][] [^2], and [Swept Tests][].

## Collision Detection vs Collision Response

There are two phases when attempting to update a game world: _detection_ of the collision, followed by the _response_, or the result of that collision (e.g. two balls bounce off of each other). This article will focus exclusively on the detection of a collision, not the response.

## Our World and Demos

The same basic setup will be used for each example of collision detection. We have a global namespace, `ro` (which is also the name of the basic engine), which will contain the following components:

* `ro.World`: responsible for adding entities, stepping/updating, and tying everything together.
* `ro.Entity`: a single "thing" that will exist in our game. It has basic properties, like position, size, acceleration, and more.
* `ro.Screen`: responsible for providing a drawing context and drawing management. Simple boxes are all that will be needed to be drawn, but separating out drawing state from the state of the world itself is good practice.
* `ro.math`: some common math utilities, like line intersection.
* `ro.ov3`: vector operations for generic objects with x/y properties
* `ro.coltech`: Short for "collision technique", this namespace will hold the constructors for our collision detection interface.

[JSFiddle][] will be used to sandbox the demos. This means that the following will be valid for each demo:

<table>
	<tr>
		<td>variable path</td>
		<td>instance type</td>
		<td>description</td>
	</tr>
	<tr>
		<td><code>bng</code></td>
		<td><code>Object</code></td>
		<td>A namespace for our demo instances<td>
	</tr>
	<tr>
		<td><code>bng.world</code></td>
		<td><code>ro.World</code></td>
		<td>Global reference to the world<td>
	</tr>
	<tr>
		<td><code>bng.world.screen</code></td>
		<td><code>ro.Screen</code></td>
		<td>Global reference to the screen (canvas and canvas 2D context)<td>
	</tr>
	<tr>
		<td><code>ov3</code></td>
		<td><code>Object</code></td>
		<td>References ro.ov3, for vector operations<td>
	</tr>
</table>

The world also uses the following order for each step of the simulation:

- Clear the screen
- Call `World.draw`
- Accelerate all entities [^3], update their AABBs 
- Call the collision system's `update` method
- Call the collision system's `queryForCollisionPairs` method
- Call the user-defined `handleCollisions`
- Apply inertia to all entities [^3], update their AABBs
- Call the user-defined `update`

All demos can be stopped/paused and started by mouseover/mouseout.

Let's get started!

## Attempt #1: Brute Force

In nearly any collision detection scheme, every object must be tested or touched by code at least once. The most simple form is called a brute force test, where every object is uniquely tested (no duplication of tests) for collision with every other object. For games with very few objects, this is more than likely the fastest and simplest method. However, the computational complexity of this method increases exponentially for every object you add:

<figure>
	<a id="fig-1"></a>
	<iframe 
		style="width: 100%; height: 465px" 
		src="http://jsfiddle.net/kirbysayshi/qHj77/embedded/result" 
		allowfullscreen="allowfullscreen" 
		frameborder="0">
	</iframe>
	<figcaption>
		Fig. 1: A graph of the number of checks required for brute force collision as the number of entities increases. For only 100 entities, nearly 5000 collision checks are required.
	</figcaption>
</figure>

This quickly becomes the biggest bottleneck of the game. But here's how to do it anyway! It is often used as an internal component of other broad phase techniques, and occasionally is the most appropriate choice for your game.

Brute force is accomplished by a nested loop:

<figure>
	<a id="fig-2"></a>
	<pre><code>
BruteForceTech.prototype.queryForCollisionPairs = function(){

	var i, j, e1, e2, pairs = [], entityLen = this.entities.length;
		
	this.collisionTests = 0;

	for( i = 0; i < entityLen; i++ ){
		e1 = this.entities[i];

		for( j = i+1; j < entityLen; j++ ){
			e2 = this.entities[j];

			this.collisionTests += 1;

			if( this.aabb2DIntersection(e1, e2) === true ){
				pairs.push( [e1, e2] );
			}
		}
	}

	return pairs;
}

BruteForceTech.prototype.aabb2DIntersection = function( objA, objB ){
	var  a = objA.getAABB()
		,b = objB.getAABB();

	if(
		a.min[0] > b.max[0] || a.min[1] > b.max[1]
		|| a.max[0] < b.min[0] || a.max[1] < b.min[1]
	){
		return false;
	} else {
		return true;
	}
}
	</code></pre>
	<figcaption>
		Fig. 2: Two functions demonstrating brute force collision detection iteration and an AABB overlap test.
	</figcaption>
</figure>

There is a small trick here to make sure we don't have to worry about testing objects more than once accidentally. The inner loop always starts at `i + 1` as opposed to `0`. This ensures that anything "behind" `i` is never touched by the inner loop. If this is confusing, the best way to understand is to work through what the loops and variables are doing using pen and paper.

This method also introduces a staple of collision detection: an AABB overlap test. AABB stands for axis-aligned bounding box, and is the box that is used as a rough estimate of where and how big an entity is. It can be defined in other ways, but each entry in `ro.coltech` expects an AABB to consist of an object with `min` and `max` properties, each pointing to an array with at least 2 numbers denoting absolute coordinates:

	var myAABB = {
		min: [ 10, 20 ], max: [ 20, 30 ]
	}

The above example describes an AABB located at `10, 20`, with a width and height of `10`.

Since the box is axis-aligned, an overlap determination is as simple as comparing the min and max points of each object respectively[^4]. Please note that this test only returns a boolean, not information about _how_ they are overlapping. The code is contained within [Fig. 2](#fig-2).

<figure>
	<a id="fig-3"></a>
	<iframe 
		style="width: 100%; height: 480px" 
		src="http://jsfiddle.net/kirbysayshi/tMCFJ/embedded/result" 
		allowfullscreen="allowfullscreen" 
		frameborder="0">
	</iframe>
	<figcaption>
		Fig. 3: Brute force collision in action! The colliding squares are darker. Click to add more and watch the framerate fall. Mouseover to start, mouseout to stop.
	</figcaption>
</figure>

[Fig. 3](#fig-3) demonstrates the result of the complete brute force technique, and visually also offers a potential optimization. In this example, all squares are being checked against all other squares, and yet only one square is actually moving. An optimization would be to construct a list of moving objects, and then compare them to all the static objects. If this is appropriate or not depends on the mechanics of the game. 

## Attempt #2: Bins / Spatial Partioning / Simple Spatial Grid

[Spatial Partitioning][], for our purposes, is the act of dividing up a continuous space into several discrete areas based on a few simple rules (the rules change with each approach). Common techniques include a [Quadtree][], a [BSP tree][], an [R-tree][], and [Bins][] / Spatial Grids, which is the topic of this section.

The rules of our gridding system are going to be as follows:

* A cell is defined as a square having discrete boundaries (e.g. it describes an exact "piece" of space).
* If an entity's bounding box overlaps with a cell, the entity will be inserted into that cell.
* An entity can be inserted into multiple cells.
* The grid will be discarded and rebuilt after every world update.
* Looking for coliding pairs requires iterating over every occupied cell of the grid.
* We must keep track of what pairs have already been tested against each other.

Spatial grids typically have a one-to-one mapping of world coordinates to a homogenous memory structure, represented by an array or linked list. Having a direct mapping to a physical space allows a spatial grid to be more easily visualized, aiding in debugging and understanding. Our grid will be represented by a 3D array. The indices of the first array will be columns, the indices of the inner array will be cells, and the innermost indices will be individual entities assigned to a cell:

<figure>
	<a id="fig-4"></a>
	<img src="images/spatial-grid-array-mapping.png" alt="Mapping space to an array" />
	<figcaption>
		Fig. 4: A rectangular object whose upper left corner is positioned at { x: 20, y: 50 }. It overlaps six grid cells, and is thus added to each. While letters (A, B, etc.) are not actually used in code, they are used here to reduce ambiguity between rows and columns. The cell that contains the upper left corner of the entity is: grid[0][B], which in actual code maps to grid[0][1].
	</figcaption>
</figure>

Mapping a position, for example `{ x: 46, y: 237 }`, can be accomplished using the following formulas:

	// Math.floor( (position - gridMinimum) / gridCellSize )

	var  col = Math.floor( (46 - grid.min.x) / grid.pxCellSize )
		,cell = Math.floor( (237 - grid.min.y) / grid.pxCellSize );
	
	grid[col][cell] = ... // bucket to put entity into

`grid.pxCellSize` is the number of pixels each cell covers. Since each cell is assumed to be square, only one value is needed. `grid.min.x/y` allows for entities to have negative positions, and still produce a valid numerical array index. Typically the grid minimum will be `{ x: 0, y: 0 }`, but you could have a grid that maps to a world like [Fig. 5](#fig-5).

<figure>
	<a id="fig-5"></a>
	<img src="images/spatial-grid-offset.png" alt="A grid mapped to a world by an offset" />
	<figcaption>
		Fig. 5: The grid, defined in grey, is offset from the origin, specified by having a non-zero min property. Accounting for this offset allows for entities with negative positions to still produce valid array indices.	
	</figcaption>
</figure>

### Initialization

Initialization is straightforward, and consists only of specifying the boundaries of the grid and the size of each cell: 

	// taken from examples/spatial-grid/orbit-sg-01.js
	new ro.coltech.SpatialGrid( 

		0,						// minimum position
		0, 

		this.screen.size.x,		// maximum position
		this.screen.size.y, 

		baseWidth * Math.SQRT2	// cellsize
	);

Cell size is actually immensely important. In the above example, `baseWidth` is defined in the demo, because it is programmatically creating all the entities. If you define a cell size by multiplying the longest side by the square root of 2, then no entity can occupy more than 4 cells. Sometimes, however, a spatial grid will require a bit more tuning.

<figure>
	<a id="fig-6"></a>
	<img src="images/spatial-grid-cs-too-small.png" alt="A spatial grid with inappropriately large entities for its cell size."/>
	<figcaption>
		Fig. 6: A spatial grid with inappropriately large entities for its cell size. The grey area denotes which cells will need to be visited to test for collisions.
	</figcaption>
</figure>

<figure>
	<a id="fig-7"></a>
	<img src="images/spatial-grid-cs-too-large.png" alt="A spatial grid with inappropriately small entities for its cell size."/>
	<figcaption>
		Fig. 7: A spatial grid with inappropriately small entities for its cell size. The grey area denotes which cells will need to be visited to test for collisions.
	</figcaption>
</figure>

In [Fig. 6](#fig-6), the effect of a very small cell size is seen when entities are large. Each entity overlaps many cells, and because the spatial grid iterates over cells, and not entities, there is actually more work for it to do than a brute force entity-to-entity comparison.

In [Fig. 7](#fig-7), a very large cell size is paired with small entities. In this case, only one cell will need to be visited, but each entity will need to be tested against every other entity, which is, again, the same as a brute force entity-to-entity comparison.

Both [Fig. 6](#fig-6) and [Fig. 7](#fig-7) are worst case scenarios: the size of the entities is a complete mismatch for the size of the cells of the grid. Unfortunately, this is one of the downsides of a strict spatial grid: it must be tuned to the entities it will hold. In addition, if there are entities that vary greatly in size, it will be no more efficient (or even worse!) than a brute force comparison, as shown in [Fig. 8](#fig-8). In this case, there is no appropriate cell size, because a smaller cell size would cause too many cell-to-cell comparisons, while a large cell size would cause as many entity-to-entity checks as the brute force method.

<figure>
	<a id="fig-8"></a>
	<img src="images/spatial-grid-cs-worst-case.png" alt="A spatial grid with entities that an appropriate cell size cannot be found."/>
	<figcaption>
		Fig. 8: A spatial grid with entities that an appropriate cell size cannot be found. The grey area denotes which cells will need to be visited to test for collisions.
	</figcaption>
</figure>

To demonstrate the effect cell size can have, [Fig. 9](#fig-9) allows for the cell size to be changed on the fly. In this case, all of the entities are similarly sized, so an efficient cell size can be found.

<figure>
	<a id="fig-9"></a>
	<iframe 
		style="width: 100%; height: 485px" 
		src="http://jsfiddle.net/kirbysayshi/VEQa7/embedded/result" 
		allowfullscreen="allowfullscreen" 
		frameborder="0">
	</iframe>
	<figcaption>
		Fig. 9: Using a spatial grid, the number of collision checks can be reduced. The three buttons change the size of the internal buckets used to group entities. A very small size produces few checks, but potentially many cells to visit. A large size produces many checks, but fewer cells to iterate through. Click to add more entities. Mouseover to start, mouseout to stop. 
	</figcaption>
</figure>

In addition to computational power required, another concern is the memory consumption of the number of allocated cells. As the grid gets more and more fine, more memory will be allocated and released after each update, causing garbage collection churn. This can cause noticeable pauses and hiccups.

### Grid Creation / Population

As said before, the spatial grid is recreated for each world step. This avoids needing to keep track of updating which cells an entity is overlapping once the entity's position has changed. The general algorithm for constructing and populating the grid is specified in [Fig. 10](#fig-10).

<figure>
	<a id="fig-10"></a>
	<code>
		<ul>
			<li>determine grid width and height</li>
			<li>determine total number of grid cells (grid width * height)</li>
			<li>create an array having a length equal to the grid width</li>
			<li>for each entity:
				<ul>
					<li>find which columns and rows the entity overlaps</li>
					<li>for each column the entity overlaps:
						<ul>
							<li>ensure the column contains an array, each index is a cell </li>
							<li>for each cell in this column that the entity overlaps:
								<ul>
									<li>ensure there is an array to hold entities</li>
									<li>insert entity into the array of entities</li>
								</ul>
							</li>
						</ul>
					</li>
				</ul>
			</li>
		</ul>
	</code>
	<figcaption>
		Fig. 10: Algorithmic view of the construction and population of the spatial grid. The actual code is defined in <a href="https://github.com/kirbysayshi/broad-phase-bng/blob/master/lib/ro.coltech.spatial-grid.js"><code>lib/ro.coltech.spatial-grid.js</code></a>, in the <code>SpatialGridTech.prototype.update</code> method.
	</figcaption>
</figure>

### Querying For Collision Pairs

Querying for collision pairs is relatively straight forward, and involves visiting each occupied cell of the grid, and comparing all objects in that cell with each other. [Fig. 11](#fig-11) has the full algorithm. 

<figure>
	<a id="fig-11"></a>
	<code>
		<ul>
			<li>For each occupied cell in the grid
				<ul>
					<li>Compare each entity in the cell with every other
						<ul>
							<li>Check if this pair has been tested before</li>
							<li>If not, check this pair, and mark them as tested</li>
						</ul>	
					</li>	
				</ul>	
			</li>
		</ul>
	</code>
	<figcaption>
		Fig. 11: Algorithmic view of the querying of the spatial grid. The actual code is defined in <a href="https://github.com/kirbysayshi/broad-phase-bng/blob/master/lib/ro.coltech.spatial-grid.js"><code>lib/ro.coltech.spatial-grid.js</code></a>, in the <code>SpatialGridTech.prototype.queryForCollisionPairs</code> method.
	</figcaption>
</figure>

The only tricky part of the algorithm is making sure that each pair is only tested once. This is easily done by ensuring that each entity has some way to uniquely identify it, aside from a strict object comparison. The easiest way to manage this in the context of a game engine is to assign an internal number to each entity when it is added to the game world, as shown in [Fig. 12](#fig-12).

<figure>
	<a id="fig-12"></a>
	<pre><code>
World.prototype.addEntity = function(entity){
	entity._roId = this.uniq++;
	entity.world = this;
	this.entities.push( entity );
	this.broadPhase.addEntity( entity );
}
	</code></pre>
	<figcaption>
		Fig. 12: Adding an entity to the game world attaches a unique id.
	</figcaption>
</figure>

Once we have unique ids, it's trivial to track which object pairs have been tested. Each pair forms two keys, `A:B` and `B:A`. These keys are then set in an object that functions as a cache. If the keys already exist, then there is no need to test a pair.

<figure>
	<a id="fig-13"></a>
	<pre><code>
hashA = entityA._roId + ':' + entityB._roId;
hashB = entityB._roId + ':' + entityA._roId;

this.hashChecks += 2;

if( !checked[hashA] && !checked[hashB] ){
	
	// mark this pair as checked
	checked[hashA] = checked[hashB] = true;

	this.collisionTests += 1;

	if( this.aabb2DIntersection( entityA, entityB ) ){
		pairs.push( [entityA, entityB] );
	}
}
	</code></pre>
	<div 
		data-ghpath="lib/ro.coltech.spatial-grid.js" 
		data-ghuserrepo="kirbysayshi/broad-phase-bng"
		data-ghlines="137-154"
		data-ghtabsize="2"></div>
	<figcaption>
		Fig. 13: Keeping a cache of tested pairs.
	</figcaption>
</figure>

### Problems

As stated before, inefficiencies can arise under certain conditions:

* Entities that vary greatly in size
* Improperly tuned cell size

The simplicity of spatial grids can often outweigh their limitation of needing to be hand-tuned. When entities are relatively close in size, and their possible bounds are well defined, spatial grids can be an excellent choice. However, in any situation where the entities vary greatly in size, or where the size of the entities cannot be known at developer time (e.g. some sort of user-controlled tool), then the simple grid demonstrated here falls down.

### Future Expansion

There are a few ways to improve this current grid implementation.

One change that is most obvious in practice is the API of the grid itself. In a non-simulation setting, collision queries are usually performed only when needed, and not globally. For example, in your player update logic for a Mario clone, you may want to know if the player is colliding with a powerup. You wouldn't **all** the various objects that are colliding, only the player and the powerups. 

One way around this would be to use different grids for different types of tests. For example, a single grid could be used for the player and powerups, while a second grid could be used for the player vs enemies. Another way is to cache the grand, global collision pairs result, and provide another interface. An example could be `isColliding( a, b )`, which could then loop through the cached result, and return true or false. 

Another improvement could be to write code that could manage creating new grids for objects of varying sizes. This would greatly complicate querying for collision pairs, as well as destroy the simplicity of the grid. If this is needed, then the next attempt will be of great interest.

## Attempt #3: Hierarchical Spatial Hash Grids

When entities greatly differ in size, or perhaps when the size of entities is not known initially, a more advanced form of spatial grid is required: a hierarchical spatial hash grid, or HSHG. This advanced grid retains several features from the basic spatial grid, but also greatly improves capabilities (with a marked rise in complexity).

I found this grid technique described in a paper by [Florian Schornbaum][] (slides are [also available][]) titled _[Hierarchical Hash Grids for Coarse Collision Detection][]_. The paper is relatively long (51 pages), and goes into great depth on the specifics and implementation of a 3D HSHG in C++. I will provide an overview of the most important concepts in 2D (the HSHG implementation also works just fine in 3D) to get a feel for why Florian's grid is so awesome.

### The Name: Hierarchical Who Now?

The name is a mouthful, but actually describes what is going on.

* **Hierarchical**: usually denotes that items have an aspect of hierarchy. This means they can be classified as being "above" or "below", or "greater" or "lesser" compared to each other. In this case, it means an ordered series of grids by cell size.
* **Spatial**: this means the same as for our basic spatial grid. Physical positions in our game world will be mapped to specific cells of the grid.
* **Hash**: this describes the method of how positions will be mapped to the cells of the grid. The positions will be hashed, or run through a particular mathematical calculation that will normalize the values.
* **Grid**: yep, it's a grid! Actually it's several grids internally, but will be interacted with as if it were one.

### And It Does What Now?

At the core, the HSHG is a series of spatial grids, each with different cell sizes. Grids are only created as necessary, meaning that the HSHG is perfectly tailored to the entities it holds: no tuning necessary! Because there are multiple cell sizes, the issue of very large vs. vary small entities is relatively moot.

There are several tricks used internally to ensure that the minimal amount of memory is used, with grids, cells, and entity containers only being intialized when necessary. 

Adding entities and removing entities is also guaranteed to occur in [constant time][], meaning that no matter how many entities are added to the grid, removal and addition will always take the same amount of time to complete. 

### Spatial Hashing

A key difference between the simple spatial grid and the HSHG is how they map physical space, e.g. a position, to logical space, e.g. a data structure. The spatial grid has a one-to-one mapping, making it simple to visualize. The HSHG uses a more complex mapping, which allows for any position to be converted to a simple array index.

[Hashing][] is the process of taking a large range of data values, and mapping them to a smaller range of keys. For example, [SHA-1][] takes practically any data and transforms it to a 160-bit value, thus reducing the possible range.

The HSHG's hashing function does the same thing, but maps a nearly infinte range of positions (limited only by the precision of the data types) to a fixed set of array indexes. It also accounts for negative positions.

<figure>
	<a id="fig-14"></a>
	<pre><code>
if(x < 0){
	i = (-x) / cellsize;
	xHash = cellcount - 1 - ( Math.floor(i) % x_cellcount );
} else {
	i = x / cellsize;
	xHash = Math.floor(i) % x_cellcount;
}
	</code></pre>
	<figcaption>
		Fig. 14: How the hashing function logically works for a single dimension. The real function avoids division (not a significant optimization in JavaScript) and uses mathematical properties to replace the modulo operation with a bitwise AND. This requires that the dimensions of the grid are always a power of two.
	</figcaption>
</figure>

So great, but what does that mean in practice? [Fig. 14](#fig-14) shows the results of the hashing function when applied to a continuous range of one-dimensional positions. It does this for three different cell sizes, which hopefully shows that as the cell size increases, so do the range of values a single cell can hold.

<figure>
	<a id="fig-14"></a>
	<iframe 
		style="width: 100%; height: 465px" 
		src="http://jsfiddle.net/kirbysayshi/2PBAs/embedded/result" 
		allowfullscreen="allowfullscreen" 
		frameborder="0">
	</iframe>
	<figcaption>Fig. 14: A graph of the hashing function used in the HSHG. Notice how the positions (X axis) "bucket" themselves.</figcaption>
</figure>

Values become grouped or bucketed together, which allows them to be mapped to an array index. This form of hashing, unlike SHA-1, maintains a relationship, meaning that hashes near each other in value are also near each other spatially, as [fig. 15](#fig-15) demonstrates.

<figure>
	<a id="fig-15"></a>
	<img src="images/hshg-linear-indexing.png" alt="Mapping linear indexes to space" />
	<figcaption>
		Fig. 15: A grid with defined boundaries can be mapped to a linear array via hash values. In this example, the grid is 7 cells wide by 5 cells tall, and each cell is displaying an example hash value. Notice how the hash values are not random, and in fact maintain their spatial relevance (e.g. cell 15 is next to cell 16).
	</figcaption>
</figure>

But what is the appropriate size for this array?

### Grid Density

The HSHG must use powers of two as the internal grid dimensions (see [Fig. 14](#fig-14)) due to the hashing function used. A grid will initially be 16x16, meaning an array with length 256. Each time an entity is added to the HSHG, the density of the grid is tracked. When the number of entities divided by number of cells is greater than a certain value (1/8 by default), the grid is emptied, all data structures are freed (or attempted to be free), the grid is expanded by a factor of two in each dimension (total cells increase by a factor of 4 in 2D), and all entities are reinserted. This prevents too many objects from being mapped to the same grid cell. If many entities were mapped to the same cell, then the detection step would devolve into the brute force method.

### Adding An Entity

When an entity is added to the HSHG, a series of internal actions take place:

* Does a grid exist that contains appropriately-sized cells?
  * Yes? Insert the entity
  * No? Create a grid

In the event that a grid does not exist, the HSHG has to determine an appropriate cell size. It does this by taking the longest side of the entity's AABB, and multiplying it by the square root of a value called the _hierarchy factor_. By default, this factor is 2, but can be tweaked. This means that each successive grid will have a cell size two times larger than the previous.

An entity is added both to an internal "global objects" list, as well as to an individual cell's object list. Each of these indices are stored. This way, when an entity needs to be removed from the grid, it is a simple matter of replacing the entity's position in these lists with the last entity in the list. This ensures [constant time][].

<figure>
	<a id="fig-16"></a>
	<img src="images/hshg-removing-element.png" alt="Removing an element from an array in constant time" />
	<figcaption>
		Fig. 16: In this array, the element at index 2 is being removed. Instead of using `splice`, the HSHG ensures constant time by taking the last element of the array, and inserting it at index 2 via a simple property assignment. The element formerly known as 6 is then marked as being element 2.
	</figcaption>
</figure>

### Querying for Collision Pairs

Querying for collision pairs is where things get a little tricky. With the basic spatial grid, each entity was added to all the cells it overlapped, and then a list was maintained to prevent duplicate tests. With the HSHG, an entity is only added to _one_ cell, and, due to a special iteration scheme, no list of "checked" pairs must be maintained.

<figure>
	<a id="fig-17"></a>
	<img src="images/hshg-cell-visitation.png" alt="Visiting cells in a special order prevents duplicate checks." />
	<figcaption>
		Fig. 17: Each pink cell is tested against each grey cell, with each grid demonstrating the next cell to be visited. When x is visited, it is checked against cells 1, 2, 3, and 4. It is only checked against cells 5, 6, 7, and 8 when those cells are visited. This diagram is reproduced nearly verbatim from the original paper.
	</figcaption>
</figure>

As [Fig. 17](#fig-17) shows, when each occupied cell is visited, it is constantly "looking back" at occupied cells behind it. This ensures that cells are never checked against each other more than once.

Because the HSHG actually has multiple grids contained within it, entities must also be checked against entities in other grids. The grids are ordered by cell size ascending. As long as small entities are always checked against bigger entities, duplicate checks should be avoided.

<figure>
	<a id="fig-18"></a>
	<img src="images/hshg-detection-hierarchy.png" alt="Grid hierarchies require working up the grids" />
	<figcaption>
		Fig. 18: This denotes a one dimensional (in terms of position) hierarchy of grids. The first group demonstrates how, when the cell containing A is checked for collisions, it must work its way up the hierarchy of grids. The second group demonstrates checking the cell containing B. Notice how B is not checked against A twice, because the checks always travel "up" the hierarchy.
	</figcaption>
</figure>

### Updating the Entities

Updating each entity is simple. Every entity's hash is recomputed. If it differs from its hash, then it is removed from the grid, and re-added. This is in stark contrast to the simple grid method, which actually destroyed the entire grid structure for every update.

### But How Does It Perform?


[^1]: For a great tutorial and explanation of how the SAT works, including tweakable demos, see [Metanet][].
	
[^2]: The term "Pixel Perfect Collision Detection" is very generic, but is an accurate description of the outcome of the technique. Most software implementations test two sprites. Each sprite is converted to a single color (e.g. blue and red), and then copied onto a graphics buffer. If any pixels are purple, the sprites have collided! Certain gaming systems, like the [NES][] and [Gameduino][] can actually do this calculation _in hardware_!

[^3]: Ro uses a technique called verlet integration, as opposed to Euler (pronounced "oiler") integration. This provides for a more stable update step, and allows us to simply move the entities to a valid position as a collision response. You may notice that the entities do not have a `velocity` property; verlet integration stores this implicitely, as the difference between `pos` and `ppos` (previous position).

[^4]: This is actually a special case of the [Hyperplane Separation Theorem][]. It is greatly simplified because the separating axes are always parallel to the X and Y axes. This test actually projects the positions of each matching side of each AABB. This can be thought of as flattening the 2D boxes to 1D for each axis. If the projections overlap, there is an intersection!

[Sweep and Prune]: http://en.wikipedia.org/wiki/Sweep_and_prune
[Spatial Partitioning]: http://en.wikipedia.org/wiki/Space_partitioning
[Pixel Perfect Collision Detection]: http://troygilbert.com/2009/08/pixel-perfect-collision-detection-revisited/
[NES]: http://nocash.emubase.de/everynes.htm
[Gameduino]: http://excamera.com/sphinx/gameduino/samples/jkcollision/index.html
[Metanet]: http://www.metanetsoftware.com/technique/tutorialB.html
[Hyperplane Separation Theorem]: http://en.wikipedia.org/wiki/Hyperplane_separation_theorem

[Swept Tests]: http://www.gamasutra.com/view/feature/3383/simple_intersection_tests_for_games.php
[JSFiddle]: http://jsfiddle.net/
[Quadtree]: http://en.wikipedia.org/wiki/Quadtree
[BSP tree]: http://en.wikipedia.org/wiki/BSP_tree
[R-tree]: http://en.wikipedia.org/wiki/R-tree
[Bins]: http://en.wikipedia.org/wiki/Bin_%28computational_geometry%29
[bullet hell]: http://en.wikipedia.org/wiki/Shoot_%27em_up#.22Bullet_hell.22_evolution_and_niche_appeal
[Florian Schornbaum]: http://www10.informatik.uni-erlangen.de/~schornbaum/
[also available]: http://www10.informatik.uni-erlangen.de/~schornbaum/hierarchical_hash_grids_slides.pdf
[Hierarchical Hash Grids for Coarse Collision Detection]: http://www10.informatik.uni-erlangen.de/~schornbaum/hierarchical_hash_grids.pdf
[constant time]: http://en.wikipedia.org/wiki/Time_complexity#Constant_time
[getImageData]: https://developer.mozilla.org/en-US/docs/HTML/Canvas/Pixel_manipulation_with_canvas#Getting_the_pixel_data_for_a_context
[Hashing]: http://en.wikipedia.org/wiki/Hash_function
[SHA-1]: http://en.wikipedia.org/wiki/Sha1
