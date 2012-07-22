<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.js"></script>
<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.math.js"></script>
<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.world.js"></script>
<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.coltech.brute-force.js"></script>
<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.coltech.hshg.js"></script>
<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.coltech.spatial-grid.js"></script>
<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.screen.js"></script>
<script type="text/javascript" src="file:///Users/drew/Dropbox/js/broad-phase-bng/lib/ro.entity.js"></script>

# Broad Phase Collision Detection Using Spatial Partitioning
# Two Approaches to Broad Phase Collision Detection Using Spatial Partitioning

## intro

- your game is slow?
- simulations
- platforms + a few guys, does not require spatial hashing


## What is Broad-Phase Collision Detection?

Collision detection is an ongoing source of research and constant optimization in game development. It can be a source of exuberance or nearly infinite frustration. Rolling your own is typically the best way to make sure your game is never finished!

Knowing what an engine does internally to make your life easier is extremely beneficial to you as a developer. In addition to increasing your knowledge and understanding, it also helps you appreciate the hard work wrought by the giants whose shoulders you're standing on.

Collision detection is typically performed in two phases: _broad phase_ and _narrrow phase_. 

Broad phase detection is typically a computationally low cost operation that quickly answers the question, "Which objects have a strong possibility of colliding?" Approaches include [Sweep and Prune][], and [Spatial Partitioning][], which is the focus of this article.

Narrow phase is the fine grained, "What part of object A colided with object B?" step. It is typically computationally intense, and thus cannot be performed on every pair of objects in the time between game updates (e.g. the next drawn frame). Examples of narrow phase techniques are [SAT][] (Separating Axis Theorem)[^1], [Pixel Perfect Collision Detection][][^2], and [Swept Tests][].

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

Let's get started!

## Attempt #1: Brute Force

In nearly any collision detection scheme, every object must be tested or touched by code at least once. The most simple form is called a brute force test, where every object is uniquely tested (no duplication of tests) for collision with every other object. For games with very few objects, this is more than likely the fastest and simplest method. However, the computational complexity of this method increases exponentially for every object you add:

| number of entities | number of tests required |
-------------------- | --------------------------
| 2 | 2 |
| 3 | 3 |
| 4 | 6 |
| 5 | 10 |
| 6 | 15 |
| ... ||  
| 10 | 45 | 
| ... ||
| 100 | 4950 |

This quickly becomes the biggest bottleneck of the game. But here's how to do it anyway! Even though this should not be used as the primary broad phase technique, it is often used as an internal component to a more complex technique.

## Attempt #2: Bins / Spatial Partioning
- talk about quadtrees? BSP trees?
- test

## Attempt #3: Hierarchical Spatial Hash Grids




## Discrete vs Continuous Detection

// TODO: use this as intro for tunneling, and some ways to mitigate (use pos + velocity for aabb, followed by fine grained swept test, etc)

, a distinction has to be made between discrete and continuous detection. Discrete detection is looking at each time step of your simulation or game as a separate, distinct moment in time. There is no attention given to velocity, or where an object is going to be or was, only where it is at this exact moment in time. Think of it as stopping the world for a moment, fixing all the objects so that they're not overlapping/colliding anymore, and then continuing.

Continous detection is usually more complicated than discrete detection, but has the advantage of accounting for the temporal aspects of an object, such as it's velocity, previous, or current position. This allows for all objects to never be located at invalid positions (such as embedded in another), since they are parameterized through time to find the exact points of collision.

While discrete detection is simpler to implement and compute than continuous detection, it can be at a severe disadvantage, especially with fast moving objects. If, when the world is sampled, the fast moving object has already traversed the path of another, there is no way for the discrete detection to know; it's not colliding at the exact moment of the test. 

Our examples today will use discrete detection, but there are ways to mitigate its disadvantages, which will be discussed later.




[^1]: For a great tutorial and explanation of how the SAT works, including tweakable demos, see [Metanet][].

[^2]: The term "Pixel Perfect Collision Detection" is very generic, but is an accurate description of the outcome of the technique. Most software implementations test two sprites. Each sprite is converted to a single color (e.g. blue and red), and then copied onto a graphics buffer. If any pixels are purple, the sprites have collided! Certain gaming systems, like the [NES][] and [Gameduino][] can actually do this calculation _in hardware_!

[Sweep and Prune]: http://en.wikipedia.org/wiki/Sweep_and_prune
[SAT]: http://en.wikipedia.org/wiki/Separating_axis_theorem
[Pixel Perfect Collision Detection]: http://troygilbert.com/2009/08/pixel-perfect-collision-detection-revisited/
[NES]: http://nocash.emubase.de/everynes.htm
[Gameduino]: http://excamera.com/sphinx/gameduino/samples/jkcollision/index.html
[Metanet]: http://www.metanetsoftware.com/technique/tutorialB.html

[Swept Tests]: http://www.gamasutra.com/view/feature/3383/simple_intersection_tests_for_games.php
[jsfiddle]: http://jsfiddle.net/