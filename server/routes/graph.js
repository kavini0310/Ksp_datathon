const express = require('express');
const db = require('../db');
const { authenticateJWT } = require('./auth');

const router = express.Router();

// Helper: Compile Graph representation from networks and fir links
function buildGraph() {
  const suspects = db.getCollection('suspects');
  const networks = db.getCollection('networks');
  const firs = db.getCollection('firs');

  const nodes = [];
  const edges = [];

  // Add suspect nodes
  suspects.forEach(s => {
    nodes.push({
      id: s.id,
      label: s.name,
      type: 'Suspect',
      subtext: s.alias,
      mugshot: s.mugshot,
      group: s.gang_association
    });
  });

  // Add FIR nodes (only recent/severe ones to prevent graph visual clutter)
  firs.slice(0, 100).forEach(f => {
    nodes.push({
      id: f.id,
      label: f.id,
      type: 'Crime',
      subtext: f.category,
      group: f.district
    });
  });

  // Add edges
  networks.forEach(net => {
    edges.push({
      id: `edge_${net.source_id}_${net.target_id}`,
      source: net.source_id,
      target: net.target_id,
      type: net.type,
      weight: net.weight
    });
  });

  return { nodes, edges };
}

// 1. Get complete graph layout for visual network
router.get('/network', authenticateJWT, (req, res) => {
  const graph = buildGraph();
  res.json(graph);
});

// 2. Compute network centrality algorithms
router.get('/metrics', authenticateJWT, (req, res) => {
  const suspects = db.getCollection('suspects');
  const networks = db.getCollection('networks');

  const N = suspects.length;
  if (N === 0) return res.json({});

  // Build adjacency list
  const adj = {};
  const inDegree = {};
  const outDegree = {};
  
  suspects.forEach(s => {
    adj[s.id] = [];
    inDegree[s.id] = 0;
    outDegree[s.id] = 0;
  });

  networks.forEach(edge => {
    // Only map suspect-to-suspect links
    if (adj[edge.source_id] && adj[edge.target_id]) {
      adj[edge.source_id].push(edge.target_id);
      adj[edge.target_id].push(edge.source_id); // Undirected representation for standard metrics
      outDegree[edge.source_id]++;
      inDegree[edge.target_id]++;
    }
  });

  // A. Degree Centrality
  const degreeCentrality = {};
  suspects.forEach(s => {
    const degree = adj[s.id].length;
    degreeCentrality[s.id] = (degree / (N - 1)).toFixed(3);
  });

  // B. PageRank Calculation (Iterative Power Method)
  const d = 0.85; // Damping factor
  let pagerank = {};
  suspects.forEach(s => pagerank[s.id] = 1 / N);

  // Run 15 iterations
  for (let iter = 0; iter < 15; iter++) {
    const nextPR = {};
    suspects.forEach(s => nextPR[s.id] = (1 - d) / N);

    suspects.forEach(s => {
      const neighbors = adj[s.id];
      if (neighbors.length > 0) {
        neighbors.forEach(n => {
          nextPR[n] += d * (pagerank[s.id] / neighbors.length);
        });
      } else {
        // Sink node redistributes to everyone
        suspects.forEach(other => {
          nextPR[other.id] += d * (pagerank[s.id] / N);
        });
      }
    });
    pagerank = nextPR;
  }

  // C. Betweenness Centrality (Simple BFS paths counting)
  const betweenness = {};
  suspects.forEach(s => betweenness[s.id] = 0);

  // Compute betweenness centrality
  suspects.forEach(start => {
    const queue = [start.id];
    const visited = new Set([start.id]);
    const parent = {};
    const dist = {};
    dist[start.id] = 0;

    while (queue.length > 0) {
      const curr = queue.shift();
      const neighbors = adj[curr] || [];

      neighbors.forEach(n => {
        if (!visited.has(n)) {
          visited.add(n);
          dist[n] = dist[curr] + 1;
          parent[n] = [curr];
          queue.push(n);
        } else if (dist[n] === dist[curr] + 1) {
          parent[n].push(curr);
        }
      });
    }

    // Accumulate path counts on nodes
    suspects.forEach(end => {
      if (end.id === start.id) return;
      
      const paths = [];
      const currentPath = [];

      function getPaths(u) {
        currentPath.push(u);
        if (u === start.id) {
          paths.push([...currentPath].reverse());
        } else {
          const pars = parent[u] || [];
          pars.forEach(p => getPaths(p));
        }
        currentPath.pop();
      }

      getPaths(end.id);

      // Increment mediator count
      paths.forEach(p => {
        // Exclude endpoints
        for (let i = 1; i < p.length - 1; i++) {
          betweenness[p[i]] += 1 / paths.length; // fractional count
        }
      });
    });
  });

  // Normalize betweenness
  const normalFactor = (N - 1) * (N - 2) || 1;
  const metrics = suspects.map(s => ({
    id: s.id,
    name: s.name,
    alias: s.alias,
    gang: s.gang_association,
    pagerank: (pagerank[s.id] * 10).toFixed(3), // Scale up for visual representation
    betweenness: (betweenness[s.id] / normalFactor).toFixed(3),
    degree: adj[s.id].length,
    degreeCentrality: degreeCentrality[s.id]
  }));

  // Sort by PageRank influence
  metrics.sort((a, b) => b.pagerank - a.pagerank);

  res.json(metrics);
});

// 3. Shortest Path connection path solver (BFS search)
router.post('/shortest-path', authenticateJWT, (req, res) => {
  const { sourceId, targetId } = req.body;
  if (!sourceId || !targetId) {
    return res.status(400).json({ error: 'Source ID and Target ID are required' });
  }

  const suspects = db.getCollection('suspects');
  const networks = db.getCollection('networks');

  // Adjacency representation with Edge descriptions
  const adj = {};
  suspects.forEach(s => adj[s.id] = []);

  networks.forEach(net => {
    if (adj[net.source_id] && adj[net.target_id]) {
      adj[net.source_id].push({ node: net.target_id, relation: net.type });
      adj[net.target_id].push({ node: net.source_id, relation: net.type });
    }
  });

  // BFS search
  const queue = [[sourceId]];
  const visited = new Set([sourceId]);
  let foundPath = null;

  while (queue.length > 0) {
    const path = queue.shift();
    const currNode = path[path.length - 1];

    if (currNode === targetId) {
      foundPath = path;
      break;
    }

    const neighbors = adj[currNode] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.node)) {
        visited.add(neighbor.node);
        queue.push([...path, neighbor.node]);
      }
    }
  }

  if (!foundPath) {
    return res.json({ path: [], message: 'No direct network link could be established between targets.' });
  }

  // Construct node and edge detail representation for frontend
  const pathDetails = foundPath.map((nodeId, idx) => {
    const suspect = db.findOne('suspects', s => s.id === nodeId);
    let edgeRelation = null;
    if (idx > 0) {
      const prevNode = foundPath[idx - 1];
      const match = adj[prevNode].find(n => n.node === nodeId);
      edgeRelation = match ? match.relation : 'Connection';
    }
    return {
      id: suspect.id,
      name: suspect.name,
      alias: suspect.alias,
      relation: edgeRelation
    };
  });

  res.json({ path: pathDetails });
});

module.exports = router;
