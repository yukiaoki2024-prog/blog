import React, { useState, useRef, useEffect } from 'react';

const GraphSimulator = () => {
  const [mode, setMode] = useState('tree');
  const [inputData, setInputData] = useState('[1, 2, 3, 4, null, 5, null]');
  const [traverseType, setTraverseType] = useState('preorder');
  
  const [visited, setVisited] = useState([]);
  const [current, setCurrent] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  const runIdRef = useRef(0);

  useEffect(() => {
    try {
      const parsed = JSON.parse(inputData);
      setError('');
      
      if (mode === 'tree') {
        if (!Array.isArray(parsed)) throw new Error('配列を入力してください');
        const newNodes = [];
        const newEdges = [];
        const width = 600;
        
        parsed.forEach((val, i) => {
          if (val === null) return;
          const depth = Math.floor(Math.log2(i + 1));
          const posInLayer = i - (Math.pow(2, depth) - 1);
          const nodesInLayer = Math.pow(2, depth);
          const x = (width / (nodesInLayer + 1)) * (posInLayer + 1);
          const y = 50 + depth * 70;
          
          newNodes.push({ id: i, val, x, y });
          
          if (i > 0) {
            const parentIdx = Math.floor((i - 1) / 2);
            if (parsed[parentIdx] !== null) {
              newEdges.push({ source: parentIdx, target: i });
            }
          }
        });
        setNodes(newNodes);
        setEdges(newEdges);
        
      } else {
        if (!Array.isArray(parsed) || !Array.isArray(parsed[0])) throw new Error('2次元配列を入力してください');
        const uniqueNodes = Array.from(new Set(parsed.flat()));
        const newNodes = [];
        const newEdges = [];
        
        const centerX = 300;
        const centerY = 150;
        const radius = 100;
        
        uniqueNodes.forEach((val, i) => {
          const angle = (i * 2 * Math.PI) / uniqueNodes.length - Math.PI / 2;
          newNodes.push({ id: val, val: val, x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) });
        });
        
        parsed.forEach(([u, v]) => {
          newEdges.push({ source: u, target: v });
        });
        
        setNodes(newNodes);
        setEdges(newEdges);
      }
    } catch (err) {
      setError('不正なJSONフォーマットです: ' + err.message);
    }
  }, [inputData, mode]);

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const runSimulation = async () => {
    if (error) return;
    setIsRunning(true);
    setVisited([]);
    setCurrent(null);
    runIdRef.current += 1;
    const currentRunId = runIdRef.current;

    let parsed = JSON.parse(inputData);

    const visit = async (id, val) => {
      if (runIdRef.current !== currentRunId) return false;
      setCurrent(id);
      await delay(800);
      
      if (runIdRef.current !== currentRunId) return false;
      setVisited(prev => [...prev, val]);
      setCurrent(null);
      await delay(300);
      return true;
    };

    if (mode === 'tree') {
      if (traverseType === 'bfs') {
        // ツリーのBFS (レベルオーダー走査)
        const queue = [0];
        while (queue.length > 0) {
          if (runIdRef.current !== currentRunId) return;
          const idx = queue.shift();
          
          if (idx >= parsed.length || parsed[idx] === null) continue;
          
          const continueRun = await visit(idx, parsed[idx]);
          if (!continueRun) return;
          
          // 子ノードをキューに追加
          if (2 * idx + 1 < parsed.length && parsed[2 * idx + 1] !== null) queue.push(2 * idx + 1);
          if (2 * idx + 2 < parsed.length && parsed[2 * idx + 2] !== null) queue.push(2 * idx + 2);
        }
      } else {
        // ツリーのDFS
        const traverseTree = async (idx) => {
          if (runIdRef.current !== currentRunId) return;
          if (idx >= parsed.length || parsed[idx] === null) return;
          
          const val = parsed[idx];
          
          if (traverseType === 'preorder') {
            const continueRun = await visit(idx, val);
            if (!continueRun) return;
          }
          
          await traverseTree(2 * idx + 1);
          
          if (traverseType === 'inorder') {
            const continueRun = await visit(idx, val);
            if (!continueRun) return;
          }
          
          await traverseTree(2 * idx + 2);
          
          if (traverseType === 'postorder') {
            const continueRun = await visit(idx, val);
            if (!continueRun) return;
          }
        };
        await traverseTree(0);
      }
      
    } else {
      // グラフの構築 (無向グラフとして双方向にエッジを張るか、有向グラフにするか)
      // ここでは入力通り(有向)に処理しますが、BFSの広がりをわかりやすくするため双方向で検索可能にしても良いです。
      const adjList = {};
      parsed.forEach(([u, v]) => {
        if (!adjList[u]) adjList[u] = [];
        if (!adjList[v]) adjList[v] = [];
        adjList[u].push(v);
        // 無向グラフとして扱う場合は以下をコメントアウト解除:
        // adjList[v].push(u); 
      });
      
      const startNodeStr = Object.keys(adjList)[0];
      if (!startNodeStr) {
        setIsRunning(false);
        return;
      }
      const startNode = isNaN(Number(startNodeStr)) ? startNodeStr : Number(startNodeStr);

      if (traverseType === 'bfs') {
        // グラフのBFS
        const visitedGraph = new Set();
        const queue = [startNode];
        visitedGraph.add(startNode);

        while (queue.length > 0) {
          if (runIdRef.current !== currentRunId) return;
          const u = queue.shift();
          
          const continueRun = await visit(u, u);
          if (!continueRun) return;

          for (const v of (adjList[u] || [])) {
            if (!visitedGraph.has(v)) {
              visitedGraph.add(v);
              queue.push(v);
            }
          }
        }
      } else {
        // グラフのDFS
        const visitedGraph = new Set();
        let activeTraverseType = traverseType;
        
        if (traverseType === 'inorder') {
          alert("一般グラフではInorderは曖昧なため、Preorderとして実行します。");
          activeTraverseType = 'preorder';
        }

        const traverseGraph = async (u) => {
          if (runIdRef.current !== currentRunId) return;
          if (visitedGraph.has(u)) return;
          visitedGraph.add(u);

          if (activeTraverseType === 'preorder') {
            const continueRun = await visit(u, u);
            if (!continueRun) return;
          }

          for (const v of (adjList[u] || [])) {
            await traverseGraph(v);
          }

          if (activeTraverseType === 'postorder') {
            const continueRun = await visit(u, u);
            if (!continueRun) return;
          }
        };

        await traverseGraph(startNode);
      }
    }

    if (runIdRef.current === currentRunId) {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    runIdRef.current += 1;
    setIsRunning(false);
    setVisited([]);
    setCurrent(null);
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setInputData(newMode === 'tree' ? '[1, 2, 3, 4, null, 5, null]' : '[[1, 2], [2, 3], [1, 4], [4, 5], [2, 6]]');
    handleReset();
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>DFS / BFS シミュレーター</h2>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>データ構造:</label>
          <select 
            disabled={isRunning}
            value={mode} 
            onChange={(e) => handleModeChange(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px' }}
          >
            <option value="tree">二分木 (配列)</option>
            <option value="graph">隣接リスト (エッジ)</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>走査順序:</label>
          <select 
            disabled={isRunning}
            value={traverseType} 
            onChange={(e) => setTraverseType(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px' }}
          >
            <option value="preorder">DFS: Preorder (行きがけ)</option>
            <option value="inorder">DFS: Inorder (通りがけ)</option>
            <option value="postorder">DFS: Postorder (帰りがけ)</option>
            <option value="bfs">BFS: 幅優先探索</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>入力データ (JSON):</label>
        <input 
          type="text" 
          disabled={isRunning}
          value={inputData} 
          onChange={(e) => setInputData(e.target.value)}
          style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        {error && <p style={{ color: 'red', marginTop: '5px' }}>{error}</p>}
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button 
          onClick={runSimulation} 
          disabled={isRunning || !!error}
          style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: (isRunning || error) ? 'not-allowed' : 'pointer' }}
        >
          {isRunning ? '実行中...' : 'シミュレーション開始'}
        </button>
        <button 
          onClick={handleReset}
          style={{ padding: '10px 20px', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          リセット
        </button>
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb', height: '350px', position: 'relative', overflow: 'hidden' }}>
        <svg width="100%" height="100%">
          {edges.map((edge, i) => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;
            return (
              <line key={i} x1={sourceNode.x} y1={sourceNode.y} x2={targetNode.x} y2={targetNode.y} stroke="#9ca3af" strokeWidth="2" />
            );
          })}
          
          {nodes.map((node) => {
            const isCurrent = current === node.id;
            const isVisited = visited.includes(node.val);
            let bgColor = 'white';
            let strokeColor = '#3b82f6';
            
            if (isCurrent) {
              bgColor = '#fef08a';
              strokeColor = '#ca8a04';
            } else if (isVisited) {
              bgColor = '#d1d5db';
              strokeColor = '#6b7280';
            }

            return (
              <g key={node.id} style={{ transition: 'all 0.3s ease' }}>
                <circle cx={node.x} cy={node.y} r="20" fill={bgColor} stroke={strokeColor} strokeWidth="3" />
                <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="central" fill="#1f2937" style={{ fontWeight: 'bold', fontSize: '14px' }}>
                  {node.val}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#eff6ff', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>探索履歴</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {visited.length === 0 && <span style={{ color: '#6b7280' }}>まだ訪問していません</span>}
          {visited.map((val, i) => (
            <div key={i} style={{ padding: '5px 12px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '9999px', fontWeight: 'bold' }}>
              {val}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GraphSimulator;
