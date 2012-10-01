
Broad Phase Collision Detection Using Spatial Grids
===================================================

## What is Broad Phase Collision Detection?

* Broad vs Narrow (Fine grained)
* examples of engines with two phases? 
* We're talking about collision _detection_ not _response_.

## Our Demo Setup and Assmptions

Use some sort of "time sucker" for fine-grained?

What about callbacks/queries? What if you only care about certain objects for this update?

## Technique #1: Brute Force

* All vs All
* Overlap test

Use it for:

* Small numbers of entities

## Technique #2: Bins / Spatial Partitioning 

* Construct an array of arrays of a fixed size, and assign to specific dimensions
* Each item in the array is a cell, which is a list of objects currently contained within
* Entities will be added to each cell they overlap
* Each cell has discrete boundary limits: an object's x/y maps directly
* The entire grid will be discarded after each update step
* Iterate through every occupied cell of the grid to discover pairs
* Track what's been tested against what
* A grid has discrete boundaries. If an object is outside of those boundaries, it cannot be tracked in the grid.

Use it for:

* Large numbers of similarly sized entities

## Technique #3: Hierarichical Spatial Hash Grid

* Similar to #2, except that the entity position (upper left corner) is hashed to geometrically map it to an abstract single array
* A grid is created for a single "class" or range of entity sizes
* Each grid is a fixed length array. When entity density grows beyond a particular value, the length of the array is increased to decrease entity density
* To query for pairs, each grid is queried, starting with the most fine-grained, and moving upwards to the coarsest.
* Each grid's cells are iterated using a set series of offsets that wrap around the boundaries of the grid (the cell all the way to the right is tested with the cell all the way to the left, like asteroids)
* Each grid's cells are iterated through using a tetris-like shape to avoid testing objects against each other more than once

* Hash calculation explaination: 
" Using 32-bit floating point numbers, a hierarchical hash grid is, in principle, suitable for simulations involving objects of the size of fine sand (0.2 mm) within a cubical simulation space with an edge length of 4 km."

"If 64-bit floating point numbers are used, objects of the size of a proton (1.5 · 10−15 m) can be simulated within a cubical space with an edge length of 3 m."

"In combination with 128-bit floating point numbers, even simulating objects as tiny as protons within a huge cubical space with an edge length of 3 · 1018 m (∼317 light-years) becomes theoretically possible."


