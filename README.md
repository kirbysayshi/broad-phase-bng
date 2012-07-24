
<link href="file:///Users/drew/Dropbox/js/broad-phase-bng/style/styles.css" rel="stylesheet" type="text/css" />

# Broad Phase Collision Detection Using Spatial Partitioning
# Two Approaches to Broad Phase Collision Detection Using Spatial Partitioning


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

<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.js"></script>
<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.math.js"></script>
<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.world.js"></script>
<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.coltech.brute-force.js"></script>
<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.coltech.hshg.js"></script>
<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.coltech.spatial-grid.js"></script>
<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.screen.js"></script>
<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.entity.js"></script>
<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.input.js"></script>

<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/examples/bruteforce/orbit-01.js"></script>

## intro

- your game is slow?
- simulations
- platforms + a few guys, does not require spatial hashing


## What is Broad-Phase Collision Detection?

Collision detection is an ongoing source of research and constant optimization in game development. It can be a source of exuberance or nearly infinite frustration. Rolling your own is typically the best way to make sure your game is never finished!

Knowing what an engine does internally to make your life easier is extremely beneficial to you as a developer. In addition to increasing your knowledge and understanding, it also helps you appreciate the hard work wrought by the giants whose shoulders you're standing on.

Collision detection is typically performed in two phases: _broad phase_ and _narrrow phase_. 

Broad phase detection is typically a computationally low cost operation that quickly answers the question, "Which objects have a strong possibility of colliding?" Approaches include [Sweep and Prune][], and [Spatial Partitioning][], which is the focus of this article.

Narrow phase is the fine grained, "What part of object A colided with object B?" step. It is typically computationally intense, and thus cannot be performed on every pair of objects in the time between game updates (e.g. the next drawn frame). Examples of narrow phase techniques are the [Hyperplane Separation Theorem][] (also known as the Separating Axis Theorem)[^1], [Pixel Perfect Collision Detection][][^2], and [Swept Tests][].

## Collision Detection vs Collision Response

There is one more important thing to note regarding this article. There are two phases when attempting to update a game world: _detection_ of the collision, followed by the _response_, or the result of that collision (e.g. two balls bounce off of each other). This article will focus exclusively on the detection of a collision, not the response.

## Our World

The same basic setup will be used for each example of collision detection. We have a global namespace, `ro` (which is also the name of the basic engine), which will contain the following components:

* ro.World: responsible for adding entities, stepping/updating, and tying everything together.
* ro.Entity: a single "thing" that will exist in our game. It has basic properties, like position, size, acceleration, and more.
* ro.Screen: responsible for providing a drawing context and drawing management. Simple boxes are all that will be needed to be drawn, but separating out drawing state from the state of the world itself is good practice.
* ro.math: some common math utilities, like line intersection.
* ro.ov3: vector operations for generic objects with x/y properties
* ro.coltech: Short for "collision technique", this namespace will hold the constructors for our collision detection interface.

[jsfiddle][] will be used to sandbox the demos. This means that the following will be valid for each demo:

| variable path  | instance type | description |
---------------- | ------------- | -------------
bng              | Object        | A namespace for our demo instances
bng.world        | ro.World      | global reference to the world
bng.world.screen | ro.Screen     | global reference to the screen
ov3              | none          | references ro.ov3, for vector operations

The world also uses the following order for each step of the simulation:

- Clear the screen
- Call `World.draw`
- Accelerate all entities [^3], update their AABBs 
- Call the collision system's `update` method
- Call the collision system's `queryForCollisionPairs` method
- Call the user-defined `handleCollisions`
- Apply inertia to all entities [^3], update their AABBs
- Call the user-defined `update`

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
	<figcaption>Fig. 1: A graph of the number of checks required for brute force collision as the number of entities increases.</figcaption>
</figure>

The equation for this series is `n(n - 1) / 2`.

This quickly becomes the biggest bottleneck of the game. But here's how to do it anyway! Even though this should probably not be used as the primary broad phase technique, it is often used as an internal component to a more complex technique.

Brute force is accomplished by a nested loop:

<figure>
	<a id="fig-2"></a>
	<script src="https://gist.github.com/3161911.js?file=brute-force-query.js"></script>
	<figcaption>Fig. 2: Two functions demonstrating brute force collision detection iteration and an AABB overlap test.</figcaption>
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
	<figcaption>Fig. 3: Brute force collision in action! The colliding squares are darker. Click to add more. (Press ESC to start/stop.)</figcaption>
</figure>

[Fig. 3](#fig-3) demonstrates the brute force technique, and visually also offers a potential optimization. In this example, all squares are being checked against all other squares, and yet only one square is actually moving. An optimization would be to construct a list of moving objects, and then compare them to all the static objects. If this is appropriate or not depends on the mechanics of the game. 

## Attempt #2: Bins / Spatial Partioning
- talk about quadtrees? BSP trees?
- test



## Attempt #3: Hierarchical Spatial Hash Grids

<figure>
	<iframe 
		style="width: 100%; height: 465px" 
		src="http://jsfiddle.net/kirbysayshi/2PBAs/embedded/result" 
		allowfullscreen="allowfullscreen" 
		frameborder="0">
	</iframe>
	<figcaption>A graph of the hashing function used in the HSHG. Notice how the positions (X axis) "bucket" themselves.</figcaption>
</figure>

## Discrete vs Continuous Detection

// TODO: use this as intro for tunneling, and some ways to mitigate (use pos + velocity for aabb, followed by fine grained swept test, etc)

, a distinction has to be made between discrete and continuous detection. Discrete detection is looking at each time step of your simulation or game as a separate, distinct moment in time. There is no attention given to velocity, or where an object is going to be or was, only where it is at this exact moment in time. Think of it as stopping the world for a moment, fixing all the objects so that they're not overlapping/colliding anymore, and then continuing.

Continous detection is usually more complicated than discrete detection, but has the advantage of accounting for the temporal aspects of an object, such as it's velocity, previous, or current position. This allows for all objects to never be located at invalid positions (such as embedded in another), since they are parameterized through time to find the exact points of collision.

While discrete detection is simpler to implement and compute than continuous detection, it can be at a severe disadvantage, especially with fast moving objects. If, when the world is sampled, the fast moving object has already traversed the path of another, there is no way for the discrete detection to know; it's not colliding at the exact moment of the test. 

Our examples today will use discrete detection, but there are ways to mitigate its disadvantages, which will be discussed later.




[^1]: For a great tutorial and explanation of how the SAT works, including tweakable demos, see [Metanet][].

[^2]: The term "Pixel Perfect Collision Detection" is very generic, but is an accurate description of the outcome of the technique. Most software implementations test two sprites. Each sprite is converted to a single color (e.g. blue and red), and then copied onto a graphics buffer. If any pixels are purple, the sprites have collided! Certain gaming systems, like the [NES][] and [Gameduino][] can actually do this calculation _in hardware_!

[^3]: Ro uses a technique called verlet integration, as opposed to Euler (pronounced "oiler") integration. This provides for a more stable update step, and allows us to simply move the entities to a valid position as a collision response. You may notice that the entities do not have a `velocity` property; verlet integration stores this implicitely, as the difference between `pos` and `ppos` (previous position).

[^4]: This is actually a special case of the [Hyperplane Separation Theorem][]. It is greatly simplified because the separating axes are always parallel to the X and Y axes. This test actually projects the positions of each matching side of each AABB. If the projections overlap, there is an intersection!

[Sweep and Prune]: http://en.wikipedia.org/wiki/Sweep_and_prune
[Pixel Perfect Collision Detection]: http://troygilbert.com/2009/08/pixel-perfect-collision-detection-revisited/
[NES]: http://nocash.emubase.de/everynes.htm
[Gameduino]: http://excamera.com/sphinx/gameduino/samples/jkcollision/index.html
[Metanet]: http://www.metanetsoftware.com/technique/tutorialB.html
[Hyperplane Separation Theorem]: http://en.wikipedia.org/wiki/Hyperplane_separation_theorem

[Swept Tests]: http://www.gamasutra.com/view/feature/3383/simple_intersection_tests_for_games.php
[jsfiddle]: http://jsfiddle.net/