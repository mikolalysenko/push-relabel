var pushRelabel = require("../preflow.js")
  , flow = pushRelabel.maxFlow
  , cut = pushRelabel.minCut


function doTest(t, num_vertices, source, sink, edges, capacities, total_flow) {
  var f = flow(num_vertices, source, sink, edges, capacities)
  console.log("FLOW:")
  for(var i=0; i<edges.length; ++i) {
    console.log(edges[i], f[i] + "/" + capacities[i])
  }
  
  var f_src = 0, f_sink = 0
  for(var i=0; i<edges.length; ++i) {
    if(edges[i][0] === source) {
      f_src += f[i]
    }
    if(edges[i][1] === source) {
      f_src -= f[i]
    }
    if(edges[i][0] === sink) {
      f_sink -= f[i]
    }
    if(edges[i][1] === sink) {
      f_sink += f[i]
    }
  }
  
  t.equals(f_src, f_sink)
  t.equals(f_src, total_flow)
  
  
  var c = cut(num_vertices, source, sink, edges, capacities)
  console.log("cut:", Array.prototype.slice.call(c, 0, c.length))
}

require("tap").test("flow", function(t) {
  
  doTest(t, 6, 0, 5,
    [[0,1],[0,2],[1,2],[2,3],[2,4],[3,5],[4,5]],
    [   2,    9,    1,    1,    7,    7,    4],
    5)
  
  doTest(t, 4, 0, 3,
    [[0,1], [1,2], [2,3]],
    [  10, 1, 10 ],
    1)

  doTest(t, 12, 0, 11,
    [     [0,1],    [1,2],    [2,3],
     [0,4],    [1,5],    [2,6],    [3,7],
          [4,5],    [5,6],    [6,7],
     [5,8],    [6,9],    [7,10],   [8,11],
          [8,9],    [9,10],    [10,11]    ],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    2)

  t.end()
})