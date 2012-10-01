---
title: Broad Phase Collision Detection Using a Hierarchical Grid
layout: default
---

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
if(x &lt; 0){
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

[Florian Schornbaum]: http://www10.informatik.uni-erlangen.de/~schornbaum/
[also available]: http://www10.informatik.uni-erlangen.de/~schornbaum/hierarchical_hash_grids_slides.pdf
[Hierarchical Hash Grids for Coarse Collision Detection]: http://www10.informatik.uni-erlangen.de/~schornbaum/hierarchical_hash_grids.pdf
[constant time]: http://en.wikipedia.org/wiki/Time_complexity#Constant_time
[getImageData]: https://developer.mozilla.org/en-US/docs/HTML/Canvas/Pixel_manipulation_with_canvas#Getting_the_pixel_data_for_a_context
[Hashing]: http://en.wikipedia.org/wiki/Hash_function
[SHA-1]: http://en.wikipedia.org/wiki/Sha1
