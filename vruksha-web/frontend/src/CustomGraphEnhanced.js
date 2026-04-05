import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';

// ------------------------------
// 1. Configuration & Constants
// ------------------------------

const NODE_TYPES = {
    CLASS: 'class',
    INDIVIDUAL: 'individual',
    OBJECT_PROPERTY: 'objectProperty',
    DATA_PROPERTY: 'dataProperty',
    EXTERNAL: 'external'
};

const COLORS = {
    [NODE_TYPES.CLASS]: '#2F855A',
    [NODE_TYPES.INDIVIDUAL]: '#48BB78',
    [NODE_TYPES.OBJECT_PROPERTY]: '#6B8E23',
    [NODE_TYPES.DATA_PROPERTY]: '#A3B18A',
    [NODE_TYPES.EXTERNAL]: '#9AA9A9',
    default: '#8FBC8F'
};

const SHAPES = {
    [NODE_TYPES.CLASS]: 'circle',
    [NODE_TYPES.INDIVIDUAL]: 'rect',
    [NODE_TYPES.OBJECT_PROPERTY]: 'diamond',
    [NODE_TYPES.DATA_PROPERTY]: 'diamond',
    default: 'circle'
};

const localName = (uri) => {
    const parts = uri.split(/[#/]/);
    return parts[parts.length - 1];
};

// ------------------------------
// 2. Data Fetching & Processing
// ------------------------------

const fetchGraphData = async (endpoint) => {
    const tripleQuery = `
        PREFIX : <urn:absolute:h/absolute:h/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 500
    `;
    const tripleRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: tripleQuery })
    });
    const tripleData = await tripleRes.json();

    const typeQuery = `
        PREFIX : <urn:absolute:h/absolute:h/>
        SELECT ?s ?type WHERE { ?s a ?type }
    `;
    const typeRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: typeQuery })
    });
    const typeData = await typeRes.json();

    const subclassQuery = `
        PREFIX : <urn:absolute:h/absolute:h/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        SELECT ?sub ?super WHERE { ?sub rdfs:subClassOf ?super }
    `;
    const subclassRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: subclassQuery })
    });
    const subclassData = await subclassRes.json();

    const commentQuery = `
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        SELECT ?s ?comment WHERE { ?s rdfs:comment ?comment }
    `;
    const commentRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: commentQuery })
    });
    const commentData = await commentRes.json();

    return { tripleData, typeData, subclassData, commentData };
};

// ------------------------------
// 3. React Component
// ------------------------------

const CustomGraphEnhanced = ({ endpoint }) => {
    const svgRef = useRef();
    const [allNodes, setAllNodes] = useState([]);
    const [allLinks, setAllLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        showClasses: true,
        showIndividuals: true,
        showObjectProperties: true,
        showDataProperties: true,
        showSubclassEdges: true
    });
    const [focusedNode, setFocusedNode] = useState(null);
    const [stats, setStats] = useState({});

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const data = await fetchGraphData(endpoint);
                processData(data);
            } catch (err) {
                console.error('Error loading graph data:', err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [endpoint]);

    const processData = ({ tripleData, typeData, subclassData, commentData }) => {
        const nodesMap = new Map();
        const edges = [];

        tripleData.results.bindings.forEach(b => {
            const s = b.s.value;
            const p = b.p.value;
            const o = b.o.value;
            const oType = b.o.type;

            if (!nodesMap.has(s)) {
                nodesMap.set(s, { id: s, label: localName(s), type: null, isExternal: false, comments: [] });
            }
            if (oType === 'uri' && !nodesMap.has(o)) {
                nodesMap.set(o, { id: o, label: localName(o), type: null, isExternal: false, comments: [] });
            }
            if (oType === 'uri') {
                edges.push({ source: s, target: o, predicate: p, label: localName(p) });
            }
        });

        typeData.results.bindings.forEach(b => {
            const s = b.s.value;
            const type = b.type.value;
            if (nodesMap.has(s)) {
                nodesMap.get(s).type = localName(type);
                nodesMap.get(s).nodeType = NODE_TYPES.INDIVIDUAL;
            }
        });

        subclassData.results.bindings.forEach(b => {
            const sub = b.sub.value;
            const sup = b.super.value;
            if (nodesMap.has(sub)) nodesMap.get(sub).nodeType = NODE_TYPES.CLASS;
            if (nodesMap.has(sup)) nodesMap.get(sup).nodeType = NODE_TYPES.CLASS;
            edges.push({ source: sub, target: sup, predicate: 'rdfs:subClassOf', label: 'subClassOf' });
        });

        commentData.results.bindings.forEach(b => {
            const s = b.s.value;
            const comment = b.comment.value;
            if (nodesMap.has(s)) {
                nodesMap.get(s).comments.push(comment);
            }
        });

        nodesMap.forEach(node => {
            if (node.id.startsWith('http://www.w3.org/')) {
                node.isExternal = true;
            }
        });

        setAllNodes(Array.from(nodesMap.values()));
        setAllLinks(edges);
        computeStats(nodesMap);
    };

    const computeStats = (nodesMap) => {
        const nodeCount = nodesMap.size;
        const classCount = Array.from(nodesMap.values()).filter(n => n.nodeType === NODE_TYPES.CLASS).length;
        const individualCount = Array.from(nodesMap.values()).filter(n => n.nodeType === NODE_TYPES.INDIVIDUAL).length;
        setStats({ nodeCount, classCount, individualCount });
    };

    const isNodeVisible = useCallback((node) => {
        if (searchTerm && !node.label.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (node.nodeType === NODE_TYPES.CLASS && !filters.showClasses) return false;
        if (node.nodeType === NODE_TYPES.INDIVIDUAL && !filters.showIndividuals) return false;
        return true;
    }, [searchTerm, filters]);

    const isLinkVisible = useCallback((link) => {
        if (link.predicate === 'rdfs:subClassOf' && !filters.showSubclassEdges) return false;
        const sourceVisible = allNodes.some(n => n.id === link.source && isNodeVisible(n));
        const targetVisible = allNodes.some(n => n.id === link.target && isNodeVisible(n));
        return sourceVisible && targetVisible;
    }, [allNodes, isNodeVisible, filters]);

    const handleNodeClick = useCallback((event, node) => {
        if (focusedNode && focusedNode.id === node.id) {
            setFocusedNode(null);
        } else {
            setFocusedNode(node);
        }
    }, [focusedNode]);

    const getNodeOpacity = useCallback((node) => {
        if (!isNodeVisible(node)) return 0.1;
        if (focusedNode) {
            if (node.id === focusedNode.id) return 1;
            const isNeighbor = allLinks.some(l => 
                (l.source === focusedNode.id && l.target === node.id) ||
                (l.target === focusedNode.id && l.source === node.id)
            );
            return isNeighbor ? 1 : 0.2;
        }
        return 1;
    }, [focusedNode, isNodeVisible, allLinks]);

    const getLinkOpacity = useCallback((link) => {
        if (!isLinkVisible(link)) return 0.3; // increased from 0.1 to 0.3
        if (focusedNode) {
            if (link.source === focusedNode.id || link.target === focusedNode.id) return 1;
            return 0.2;
        }
        return 0.8; // default visible links
    }, [focusedNode, isLinkVisible]);

    // Main D3 rendering effect
    useEffect(() => {
        if (!allNodes.length || !svgRef.current) return;

        // Filter links to ensure both source and target exist
        const validLinks = allLinks.filter(link => {
            const sourceExists = allNodes.some(n => n.id === link.source);
            const targetExists = allNodes.some(n => n.id === link.target);
            return sourceExists && targetExists;
        });

        const width = svgRef.current.clientWidth || 800;
        const height = svgRef.current.clientHeight || 600;

        d3.select(svgRef.current).selectAll('*').remove();
        const svg = d3.select(svgRef.current)
            .attr('viewBox', [0, 0, width, height])
            .style('background', '#1e2b2c');

        const g = svg.append('g');
        const zoom = d3.zoom()
            .scaleExtent([0.1, 5])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });
        svg.call(zoom);

        // Arrow marker
        svg.append('defs').append('marker')
            .attr('id', 'arrow')
            .attr('viewBox', '-0 -5 10 10')
            .attr('refX', 22)
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 8)
            .attr('markerHeight', 8)
            .append('svg:path')
            .attr('d', 'M 0,-5 L 10,0 L 0,5')
            .attr('fill', '#ccc');

        const simulation = d3.forceSimulation(allNodes)
            .force('link', d3.forceLink(validLinks).id(d => d.id).distance(250).strength(0.2))
            .force('charge', d3.forceManyBody().strength(-400))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(50))
            .alphaDecay(0.02)
            .velocityDecay(0.6);

        const link = g.append('g')
            .attr('class', 'links')
            .selectAll('path')
            .data(validLinks)
            .enter().append('path')
            .attr('stroke', '#ccc')
            .attr('stroke-opacity', 0.8)
            .attr('stroke-width', 2.5)
            .attr('fill', 'none')
            .attr('stroke-dasharray', d => d.predicate === 'rdfs:subClassOf' ? '5,5' : 'none')
            .attr('marker-end', d => d.predicate === 'rdfs:subClassOf' ? null : 'url(#arrow)')
            .attr('opacity', d => getLinkOpacity(d));

        const node = g.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(allNodes)
            .enter().append('g')
            .attr('class', 'node-group')
            .attr('cursor', 'pointer')
            .on('click', handleNodeClick)
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended))
            .attr('opacity', d => getNodeOpacity(d));

        node.each(function(d) {
            const group = d3.select(this);
            const shape = SHAPES[d.nodeType] || SHAPES.default;
            const color = COLORS[d.nodeType] || COLORS.default;

            if (d.isExternal) {
                group.append('circle')
                    .attr('r', 12)
                    .attr('fill', 'none')
                    .attr('stroke', color)
                    .attr('stroke-width', 2)
                    .attr('stroke-dasharray', '5,5');
            }
            if (shape === 'circle') {
                group.append('circle')
                    .attr('r', 12)
                    .attr('fill', color)
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 1.5);
            } else if (shape === 'rect') {
                group.append('rect')
                    .attr('width', 20)
                    .attr('height', 20)
                    .attr('x', -10)
                    .attr('y', -10)
                    .attr('fill', color)
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 1.5);
            } else if (shape === 'diamond') {
                group.append('path')
                    .attr('d', 'M0,-10 L10,0 L0,10 L-10,0Z')
                    .attr('fill', color)
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 1.5);
            }
        });

        node.append('rect')
            .attr('x', 15)
            .attr('y', -8)
            .attr('width', d => d.label.length * 7 + 8)
            .attr('height', 18)
            .attr('fill', 'rgba(30, 43, 44, 0.9)')
            .attr('rx', 4)
            .attr('ry', 4)
            .style('pointer-events', 'none');

        node.append('text')
            .text(d => d.label)
            .attr('dx', 19)
            .attr('dy', 6)
            .attr('fill', '#fff')
            .attr('font-size', 12)
            .attr('font-weight', d => d.nodeType === NODE_TYPES.CLASS ? 'bold' : 'normal')
            .style('pointer-events', 'none');

        node.append('title').text(d => {
            let tip = `${d.label}\nType: ${d.nodeType || 'unknown'}`;
            if (d.comments.length) tip += `\nComment: ${d.comments[0]}`;
            return tip;
        });

        simulation.on('tick', () => {
            link.attr('d', d => {
                const dx = d.target.x - d.source.x;
                const dy = d.target.y - d.source.y;
                const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
                return `M${d.source.x},${d.source.y} A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
            });

            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }

        return () => simulation.stop();
    }, [allNodes, allLinks, focusedNode, getNodeOpacity, getLinkOpacity, handleNodeClick]);

    // Update opacities on filter/search/focus change
    useEffect(() => {
        if (!svgRef.current) return;
        d3.select(svgRef.current).selectAll('.node-group')
            .transition().duration(500)
            .attr('opacity', d => getNodeOpacity(d));
        d3.select(svgRef.current).selectAll('.links path')
            .transition().duration(500)
            .attr('opacity', d => getLinkOpacity(d));
    }, [searchTerm, filters, focusedNode, allNodes, allLinks, getNodeOpacity, getLinkOpacity]);

    // ------------------------------
    // 4. UI Components (Filters, Search, Stats)
    // ------------------------------

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div style={{
                position: 'absolute',
                top: 10,
                left: 10,
                zIndex: 10,
                background: 'rgba(30, 43, 44, 0.9)',
                padding: '10px',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                maxWidth: '250px',
                color: '#fff'
            }}>
                <h4 style={{ margin: '0 0 8px 0' }}>Search</h4>
                <input
                    type="text"
                    placeholder="Search nodes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '4px', background: '#2a3b3c', border: '1px solid #48BB78', color: '#fff' }}
                />
                <h4 style={{ margin: '12px 0 8px 0' }}>Filters</h4>
                <label><input type="checkbox" checked={filters.showClasses} onChange={() => setFilters({...filters, showClasses: !filters.showClasses})} /> Classes</label><br />
                <label><input type="checkbox" checked={filters.showIndividuals} onChange={() => setFilters({...filters, showIndividuals: !filters.showIndividuals})} /> Individuals</label><br />
                <label><input type="checkbox" checked={filters.showObjectProperties} onChange={() => setFilters({...filters, showObjectProperties: !filters.showObjectProperties})} /> Object Properties</label><br />
                <label><input type="checkbox" checked={filters.showDataProperties} onChange={() => setFilters({...filters, showDataProperties: !filters.showDataProperties})} /> Data Properties</label><br />
                <label><input type="checkbox" checked={filters.showSubclassEdges} onChange={() => setFilters({...filters, showSubclassEdges: !filters.showSubclassEdges})} /> Subclass Edges</label>
                <h4 style={{ margin: '12px 0 8px 0' }}>Stats</h4>
                <div>Nodes: {stats.nodeCount || 0}</div>
                <div>Classes: {stats.classCount || 0}</div>
                <div>Individuals: {stats.individualCount || 0}</div>
                {focusedNode && (
                    <button onClick={() => setFocusedNode(null)} style={{ marginTop: '10px', width: '100%' }}>
                        Clear Focus
                    </button>
                )}
            </div>

            <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
};

export default CustomGraphEnhanced;