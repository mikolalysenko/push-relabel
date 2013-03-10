var pushRelabel = require("../preflow.js")
  , flow = pushRelabel.maxFlow
  , cut = pushRelabel.minCut


function doTest(num_vertices, source, sink, edges, capacities) {
  var f = flow(num_vertices, source, sink, edges, capacities)
  for(var i=0; i<edges.length; ++i) {
    console.log("edge:", edges[i], f[i] + "/" + capacities[i])
  }
  
  console.log("cut:", cut(num_vertices, source, sink, edges, capacities))
}

require("tap").test("flow", function(t) {
  
  doTest(6, 0, 5,
    [[0,1],[0,2],[1,2],[2,3],[2,4],[3,5],[4,5]],
    [   2,    9,    1,    1,    7,    7,    4])
  
  
  doTest(4, 0, 3,
    [[0,1], [1,2], [2,3]],
    [  10, 1, 10 ])
  t.end()
})