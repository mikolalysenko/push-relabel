push-relabel
============
[Network flow](http://en.wikipedia.org/wiki/Flow_network) is a fundamental tool in computer science and operations research, and can be used to solve many common tasks such as:

* [Transportation problems](http://en.wikipedia.org/wiki/Transportation_problem)
* [Assignment problems](http://en.wikipedia.org/wiki/Assignment_problem)
* [Bipartite matching](http://en.wikipedia.org/wiki/Bipartite_matching#Maximum_bipartite_matchings)
* [Project selection](http://www.jstor.org/discover/10.2307/2582634?uid=3739664&uid=2&uid=4&uid=3739256&sid=21101798266301)
* [Image segmentation](http://en.wikipedia.org/wiki/Graph_cuts_in_computer_vision)
* [Stereo vision](http://ieeexplore.ieee.org/xpl/login.jsp?tp=&arnumber=1315016&url=http%3A%2F%2Fieeexplore.ieee.org%2Fxpls%2Fabs_all.jsp%3Farnumber%3D1315016)

This library is an implementation of Goldberg and Tarjan's [push-relabel algorithm](http://en.wikipedia.org/wiki/Push%E2%80%93relabel_maximum_flow_algorithm) for solving network flow problems in JavaScript.  It use relabel-to-front ordering as well as the global and gap relabelling heuristics, as described by [Cherkassy and Goldberg](https://www.ads.tuwien.ac.at/teaching/archiv/praktika/CherkasskyGoldberg-1995-MaxFlow.pdf), giving it a run time on the order of |V|^3 in the worst case.

Currently in early development, patches welcome!

Usage
=====
To install the library, use npm:

    npm install push-relabel
    
And then you can call it as follows:

```javascript
//Solve flow for following network:
//
//       1
//      ^ |
//   2 /  |1
//    /   V   1
//  s=0-->2--->3
//      9 |    |
//        |7   |7
//        V    V
//        4--->t=5
//            4
//
var num_vertices = 6
var source       = 0
var sink         = 5
var edges        = [[0,1],[0,2],[1,2],[2,3],[2,4],[3,5],[4,5]]
var capacities   = [   2,   9,    1,    1,    7,    7,    4  ]


//Load library
var pushRelabel = require("push-relabel")

//Compute maximum flow
var flow = pushRelabel.maxFlow(num_vertices, source, sink, edges, capacities)
for(var i=0; i<edges.length; ++i) {
  console.log("edge:", edges[i], flow[i] + "/" + capacities[i])
}

//Compute minimum cut
var cut = pushRelabel.minCut(num_vertices, source, sink, edges, capacities)
console.log(cut)
```

API
===
There are two functions exposed by the library:

### `pushRelabel.maxFlow(num_vertices, source, sink, edges, capacities[, flow, dual])`
Computes a [maximum flow](http://en.wikipedia.org/wiki/Maximum_flow_problem) in a network.

* `num_vertices` is the number of vertices in the graph
* `source` is the index of the source vertex
* `sink` is the index of the sink vertex
* `edges` is a list of edges in the graph
* `capacities` is a list of per-edge capacities.  Must have size >= `edges.length`
* `flow` (optional) is an array which will get the resulting flow.  If not specified, a new flow array is allocated.  Must be of size at least `edges.length`
* `dual` (optional) is the topological dual of the flow network.  If not specified, a new dual is computed.

**WARNING** If you don't specify a dual, the library will permute the order of the edges/capacities array

Returns: The flow, which is stored in the object `flow`

### `pushRelabel.minCut(num_vertices, source, sink, edges, capacities[, cut, dual])`
Computes a [minimum cut](http://en.wikipedia.org/wiki/Minimum_cut) in a flow network

* `num_vertices` is the number of vertices in the graph
* `source` is the index of the source vertex
* `sink` is the index of the sink vertex
* `edges` is a list of edges in the graph
* `capacities` is a list of per-edge capacities.  Must have size >= `edges.length`
* `cut` (optional) is an array which will get the resulting cut.  If not specified, a new uint8 array is allocated.  Must be of size at least `num_vertices
* `dual` (optional) is the topological dual of the flow network.  If not specified, a new dual is computed.

**WARNING** If you don't specify a dual, the library will permute the order of the edges/capacities array

Returns: The cut

Credits
=======
(c) 2013 Mikola Lysenko.  BSD License
