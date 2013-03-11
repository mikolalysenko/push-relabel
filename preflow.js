"use strict"

var top = require("simplicial-complex")
var bits = require("bit-twiddle")

//Floating point tolerance
var EPSILON = 1e-8

//Flow stuff
var GAP = 0
var MAX_LABEL = 0
var LABEL = new Uint32Array(1024)
var EXCESS = new Float64Array(1024)
var SEEN = new Uint32Array(1024)
var LABEL_COUNT = new Uint32Array(2048)

//Basic data structure intialization
function initFlow(num_vertices) {
  MAX_LABEL = GAP = 2*num_vertices
  if(num_vertices > LABEL.length) {
    var nl = bits.nextPow2(num_vertices)
    LABEL = new Uint32Array(nl)
    EXCESS = new Float64Array(nl)
    SEEN = new Uint32Array(nl)
    LABEL_COUNT = new Uint32Array(MAX_LABEL)
  } else {
    for(var i=0; i<num_vertices; ++i) {
      LABEL[i] = 0
      EXCESS[i] = 0.0
      SEEN[i] = 0
      LABEL_COUNT[i] = 0
    }
    for(i=num_vertices; i<MAX_LABEL; ++i) {
      LABEL_COUNT[i] = 0
    }
  }
}

//cache-oblivious queue
var FIFO_LEN = 0
var FIFO_HEIGHT = 0
var FIFO = new Int32Array(1024)

//Initialize FIFO
function initFIFO(num_vertices) {
  FIFO_LEN = bits.nextPow2(2*(num_vertices-2))
  FIFO_HEIGHT = bits.log2(FIFO_LEN)
  if(FIFO.length < FIFO_LEN+1) {
    FIFO = new Int32Array(FIFO_LEN+1)
  }
}

//Move item to front of queue
function moveToFront(idx) {
  var x = FIFO[idx], y=0
    , i=0, j=0, k=0
    , n=0, d=0, count=1
  FIFO[idx] = -1
  if(FIFO[0] < 0) {
    FIFO[0] = x
    return 0
  }
  d=1
  for(i=2; i<=FIFO_LEN; i<<=1, ++d) {
    //Count items in array
    do {
      if(FIFO[j] >= 0) {
        ++count
      }
    } while(++j < i)
    //If enough space in this section, rebalance array
    if(4 * FIFO_HEIGHT * count <= (3 * FIFO_HEIGHT + d) * i) {
      n = i
      //Compact to end of array
      do {
        y = FIFO[--i]
        if(y>=0) {
          FIFO[--j] = y
        }
      } while(i)
      FIFO[--j] = x
      //Redistribute uniformly
      do {
        if(k < j) {
          FIFO[k++] = -1
        }
        FIFO[k++] = FIFO[j++]
      } while(j < n)
      while(k < n) {
        FIFO[k++] = -1
      }
      return FIFO[0] < 0 ? 1 : 0
    }
  }
}

//Initializes preflow values
function dischargeSource(num_vertices, source, sink, edges, capacities, flow, dual) {
  EXCESS[source] = Number.POSITIVE_INFINITY
  EXCESS[sink] = Number.NEGATIVE_INFINITY
  var nbhd = dual[source]
  for(var i = nbhd.length-1; i>= 0; --i) {
    var e = nbhd[i]|0
    var c = +capacities[e]
    var edge = edges[e]
    if(edge[0] === source) {
      flow[e] = c
      EXCESS[edge[1]] += c
    } else {
      flow[e] = -c
      EXCESS[edge[0]] -= c
    }
  }
}

//Global relabeling heuristic.  Recomputes all the LABELs for all the nodes in the graph
function globalRelabel(num_vertices, source, sink, edges, capacities, flow, dual) {
  //First, clear LABELs
  for(var i=0; i<num_vertices; ++i) {
    if(LABEL[i] < GAP) {
      LABEL[i] = 0
    } else {
      LABEL[i] = MAX_LABEL
    }
    LABEL_COUNT[i] = 0
  }
  //Next, initialize fifo using breadth first search and set boundary conditions on sink/source
  var p = FIFO_LEN+1
    , c = p
  FIFO[--p] = sink
  LABEL[sink] = 1
  LABEL[source] = MAX_LABEL
  while(c > p) {
    var u = FIFO[--c], v
      , h = LABEL[u]+1
      , nbhd = dual[u]
    for(var i=nbhd.length-1; i>=0; --i) {
      var e = nbhd[i]|0
        , cap = capacities[e]
        , flo = flow[e]
        , edge = edges[e]
      //Check if edge contained in residual
      if(edge[0] === u) {
        if(cap + flo < EPSILON) {
          continue
        }
        v = edge[1]
      } else {
        if(cap - flo < EPSILON) {
          continue
        }
        v = edge[0]
      }
      if(LABEL[v]) {
        continue
      }
      LABEL[v] = h
      SEEN[v] = 0
      ++LABEL_COUNT[h]
      FIFO[--p] = v
    }
  }
  //Set current gap
  GAP = h
  //Finally, redistribute items in FIFO uniformly
  var i=0, j=p
  while(j < FIFO_LEN) {
    FIFO[i++] = -1
    FIFO[i++] = FIFO[j++]
  }
  while(i < FIFO_LEN) {
    FIFO[i++] = -1
  }
}

//Push flow along an edge
function push(e, u, edges, capacities, flow) {
  var cap = capacities[e]
    , flo = flow[e]
    , edge = edges[e]
    , delta, sign = 1, v
  if(edge[0] === u) {
    delta = cap - flo
    v = edge[1]
  } else {
    delta = cap + flo
    v = edge[0]
    sign = -1
  }
  if(delta < EPSILON || LABEL[u] <= LABEL[v]) {
    return false
  }
  delta = Math.min(EXCESS[u], delta)
  EXCESS[u] -= delta
  EXCESS[v] += delta
  flow[e] += sign * delta
  return true
}

//Relabel vertex u
function relabel(u, nbhd, num_vertices, edges, capacities, flow) {
  var label = MAX_LABEL, v
  for(var i=nbhd.length-1; i>=0; --i) {
    var e = nbhd[i]
      , cap = capacities[e]
      , flo = flow[e]
      , edge = edges[e]
    if(edge[0] === u) {
      if(cap - flo < EPSILON) {
        continue
      }
      v = edge[1]
    } else {
      if(cap + flo < EPSILON) {
        continue
      }
      v = edge[0]
    }
    label = Math.min(label, LABEL[v])
  }
  //Update label
  label = Math.min(MAX_LABEL, label+1)
  if(LABEL[u] !== label) {
    ++LABEL_COUNT[label]
    if(--LABEL_COUNT[LABEL[u]] === 0) {
      GAP = LABEL[u]
    }
    LABEL[u] = label
    return true
  }
  return false
}

function pushRelabel(num_vertices, source, sink, edges, capacities, flow, dual) {
  var global_countdown = edges.length
  for(var p=0; p<FIFO_LEN; ++p) {
    //Apply global relabelling when we hit countdown
    if(global_countdown < 0) {
      globalRelabel(num_vertices, source, sink, edges, capacities, flow, dual)
      global_countdown = edges.length
      p = -1
      continue
    }
    //Read vertex
    var u = FIFO[p]
    if(u < 0) {
      continue
    }
    //If u is above gap throw it out
    if(LABEL[u] > GAP) {
      FIFO[p] = -1
      LABEL[u] = MAX_LABEL
      continue
    }

    //Discharge u
    var nbhd = dual[u]
    while(EXCESS[u] > 0) {
      if(SEEN[u] < nbhd.length) {
        //Push along edge
        if(push(nbhd[SEEN[u]++], u, edges, capacities, flow)) {
          --global_countdown
        }
      } else {
        //Relabel vertex, move u to front
        if(relabel(u, nbhd, num_vertices, edges, capacities, flow)) {
          p = moveToFront(p)
          --global_countdown
        }
        SEEN[u] = 0
        break
      }
    }
  }
}

//Remove excess flow along a cycle
function removeCycle(cycle_edge, start, end, offset, edges, capacities, flow, dual) {
  //Step 1: Compute excess flow along cycle
  var parents = LABEL
    , path = SEEN
    , p = 0
    , u = start
    , delta = EXCESS[end]
  if(cycle_edge >= 0) {
    var edge = edges[cycle_edge]
    if(edge[0] === start) {
      delta = capacities[cycle_edge] - flow[cycle_edge]
    } else {
      delta = capacities[cycle_edge] + flow[cycle_edge]
    }
  }
  while(u !== end) {
    var v = parents[u] - offset
      , nbhd = dual[u]
    for(var i=nbhd.length-1; i>=0; --i) {
      var e = nbhd[i]
        , cap = capacities[e]
        , flo = flow[e]
        , edge = edges[e]
        , D
      if(edge[0] === v) {
        D = cap - flo
      } else if(edge[1] === v) {
        D = cap + flo
      } else {
        continue
      }
      if(D < EPSILON) {
        continue
      }
      //console.log(u+"->"+v, D)
      path[p++] = e
      delta = Math.min(delta, D)
      break
    }
    u = v
  }
  //console.log("Capacity=", delta)
  
  //Step 2: drain flow
  if(cycle_edge >= 0) {
    var edge = edges[cycle_edge]
    if(edge[0] === start) {
      flow[cycle_edge] -= delta
    } else {
      flow[cycle_edge] += delta
    }
  }
  u = start
  EXCESS[end] -= delta
  for(var i=0; i<p; ++i) {
    var e = path[i]
    if(edges[e][0] === u) {
      flow[e] -= delta
    } else {
      flow[e] += delta
    }
    u = parents[u] - offset
  }
}



function removeExcess(num_vertices, source, sink, edges, capacities, flow, dual) {

  //console.log("Draining excess flow")

  //Remove flow along self-loops
  for(var i=0; i<edges.length; ++i) {
    var edge = edges[i]
    if(edge[0] === edge[1]) {
      var f = flow[i]
      if(f < 0) {
        EXCESS[edge[0]] += f
      } else {
        EXCESS[edge[0]] -= f
      }
      flow[i] = 0
    }
  }

  //Remove excess flow from cycles
  var step = MAX_LABEL+1
    , offset = 0
    , stack = SEEN
    , parents = LABEL
  for(var i=num_vertices-1; i>=0; --i) {
    if(i === source || i === sink) {
      continue
    }
u_loop:
    while(EXCESS[i] > EPSILON) {
      //DFS from u
      var sp=0
      offset += step
      parents[i] = offset + i
      parents[source] = offset
      stack[sp++] = i
      //console.log("Starting DFS from: ", i, ", XS=", EXCESS[i])
      while(sp > 0) {
        var u = stack[--sp], v
          , nbhd = dual[u]
        //console.log("Visit:", u, " parent = ", LABEL[u]-offset)
        for(var j=nbhd.length-1; j>=0; --j) {
          var e = nbhd[j]
            , cap = capacities[e]
            , flo = flow[e]
            , edge = edges[e]
          if(edge[0] === u) {
            if(cap - flo < EPSILON) {
              continue
            }
            v = edge[1]
          } else {
            if(cap + flo < EPSILON) {
              continue
            }
            v = edge[0]
          }
          if(EXCESS[v] < EPSILON) {
            continue
          }
          //console.log("edge:", edge, cap+"/"+flo)
          //Found a back edge
          if(parents[v] >= offset) {
            //console.log("Back edge found")
            if(v === source) {
              //console.log("Path", v, i)
              LABEL[source] = offset+u
              removeCycle(-1, v, i, offset, edges, capacities, flow, dual)
            } else {
              //console.log("Cycle", u, v)
              removeCycle(e, u, i, offset, edges, capacities, flow, dual)
            }
            continue u_loop
          } else {
            LABEL[v] = offset + u
            stack[sp++] = v
          }
        }
      }
      break
    }
  }
}


function maxFlow(num_vertices, source, sink, edges, capacities, flow, dual) {
  num_vertices |= 0
  source |= 0
  sink |= 0
  
  //Compute dual of graph if not specified
  if(!dual) {
    top.normalize(edges, capacities)
    dual = top.dual(edges)
  }
  
  //Allocate new flow field if necessary
  if(!flow) {
    flow = new Float64Array(edges.length)
  } else {
    for(var i=0; i<edges.length; ++i) {
      flow[i] = 0.0
    }
  }
  
  //Initialization
  initFlow(num_vertices)
  initFIFO(num_vertices)
  dischargeSource(num_vertices, source, sink, edges, capacities, flow, dual)
  globalRelabel(num_vertices, source, sink, edges, capacities, flow, dual)
  
  //Solve using Goldberg&Tarjan's two-phase algorithm
  pushRelabel(num_vertices, source, sink, edges, capacities, flow, dual)
  removeExcess(num_vertices, source, sink, edges, capacities, flow, dual)
  
  return flow
}


var FLOW_BUFFER = new Float64Array(1024)

function minCut(num_vertices, source, sink, edges, capacities, cut, dual) {

  num_vertices |= 0
  source |= 0
  sink |= 0
  
  //Compute dual of graph if not specified
  if(!dual) {
    top.normalize(edges, capacities)
    dual = top.dual(edges)
  }
  
  //Allocate new flow field if necessary
  var flow = FLOW_BUFFER
  if(FLOW_BUFFER.length < edges.length) {
    FLOW_BUFFER = new Float64Array(edges.length)
    flow = FLOW_BUFFER
  } else {
    for(var i=0; i<edges.length; ++i) {
      flow[i] = 0.0
    }
  }
  
  //Initialization
  initFlow(num_vertices)
  initFIFO(num_vertices)
  dischargeSource(num_vertices, source, sink, edges, capacities, flow, dual)
  globalRelabel(num_vertices, source, sink, edges, capacities, flow, dual)
  
  //Only do push-relabel phase, can compute cut from saturated preflow
  pushRelabel(num_vertices, source, sink, edges, capacities, flow, dual)
  
  if(!cut) {
    cut = new Uint8Array(num_vertices)
  }
  for(var i=0; i<num_vertices; ++i) {
    cut[i] = LABEL[i] > GAP
  }
  return cut
}

exports.maxFlow = maxFlow
exports.minCut = minCut
