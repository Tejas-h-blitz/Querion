"use client";

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ExplainPlan } from '@/lib/api';
import { RotateCcw } from 'lucide-react';

interface ExplainTreeProps {
  data: ExplainPlan;
}

export default function ExplainTree({ data }: ExplainTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const zoomRef = useRef<any>(null);

  // Assign stable paths as IDs
  const prepareData = (node: ExplainPlan, path = 'root'): any => {
    const clone = { ...node, id: path } as any;
    if (node.children) {
      clone.children = node.children.map((child, idx) => prepareData(child, `${path}-${idx}`));
    }
    return clone;
  };

  const processedData = prepareData(data);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = 850;
    const height = 500;
    const margin = { top: 40, right: 150, bottom: 40, left: 120 };

    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", "100%");

    // Clear previous elements if any, keep the main group if it exists
    let g = svg.select<SVGGElement>("g.zoom-container");
    if (g.empty()) {
      g = svg.append("g").attr("class", "zoom-container");
    }

    // Set up D3 Zoom
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom as any);

    // Tree layout configuration
    const treemap = d3.tree().size([
      height - margin.top - margin.bottom, 
      width - margin.left - margin.right
    ]);

    const root = d3.hierarchy(processedData, (d: any) => d.children);
    treemap(root);

    // Compute min/max domains dynamically
    let maxTime = 0.01;
    let maxRows = 1;
    root.each((d: any) => {
      if (d.data.actual_total_time > maxTime) maxTime = d.data.actual_total_time;
      if (d.data.actual_rows > maxRows) maxRows = d.data.actual_rows;
    });

    const colorScale = d3.scaleSequential(d3.interpolateRdYlGn).domain([maxTime, 0]);
    const radiusScale = d3.scaleSqrt().domain([0, maxRows]).range([8, 28]);

    // Check helper for descendants highlight
    const isDescendant = (parentId: string, childNode: any): boolean => {
      let current = childNode;
      while (current) {
        if (current.data.id === parentId) return true;
        current = current.parent;
      }
      return false;
    };

    // UPDATE / DRAW LINKS
    const links = g.selectAll<SVGPathElement, any>("path.link")
      .data(root.links(), (d: any) => d.target.data.id);

    // Link transitions and entries
    const linkEnter = links.enter()
      .append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "#1E1E2E")
      .attr("stroke-width", 2)
      .attr("d", d3.linkHorizontal()
        .x((d: any) => d.y + margin.left)
        .y((d: any) => d.x + margin.top) as any
      );

    const mergedLinks = linkEnter.merge(links as any);
    
    mergedLinks.transition()
      .duration(400)
      .attr("d", d3.linkHorizontal()
        .x((d: any) => d.y + margin.left)
        .y((d: any) => d.x + margin.top) as any
      )
      .attr("stroke", (d: any) => {
        if (!highlightedId) return "#1E1E2E";
        // Highlight links inside the highlighted subtree
        if (isDescendant(highlightedId, d.target)) return "#6366F1";
        return "#13131A";
      })
      .attr("stroke-width", (d: any) => {
        if (highlightedId && isDescendant(highlightedId, d.target)) return 3;
        return 2;
      })
      .attr("opacity", (d: any) => {
        if (!highlightedId) return 1;
        if (isDescendant(highlightedId, d.target)) return 1;
        return 0.15;
      });

    links.exit().remove();

    // UPDATE / DRAW NODES
    const nodes = g.selectAll<SVGGElement, any>("g.node")
      .data(root.descendants(), (d: any) => d.data.id);

    const nodeEnter = nodes.enter()
      .append("g")
      .attr("class", "node cursor-pointer")
      .attr("transform", (d: any) => `translate(${d.y + margin.left}, ${d.x + margin.top})`);

    // Circle base
    nodeEnter.append("circle")
      .attr("r", 0) // start small for transition
      .attr("stroke-width", 2)
      .attr("stroke", "#1E1E2E");

    // Text label
    nodeEnter.append("text")
      .attr("dy", ".35em")
      .attr("y", (d: any) => (radiusScale(d.data.actual_rows) + 8) * -1)
      .attr("text-anchor", "middle")
      .attr("fill", "#E2E8F0")
      .style("font-size", "10px")
      .style("font-family", "var(--font-sans)")
      .style("pointer-events", "none")
      .text((d: any) => {
        const shortName = d.data.node_type;
        if (d.data.relation_name) {
          return `${shortName} (${d.data.relation_name})`;
        }
        return shortName;
      });

    const mergedNodes = nodeEnter.merge(nodes as any);

    // Slide nodes to positions and highlight them
    mergedNodes.transition()
      .duration(400)
      .attr("transform", (d: any) => `translate(${d.y + margin.left}, ${d.x + margin.top})`);

    mergedNodes.select("circle")
      .transition()
      .duration(400)
      .attr("r", (d: any) => radiusScale(d.data.actual_rows))
      .attr("fill", (d: any) => colorScale(d.data.actual_total_time))
      .attr("stroke", (d: any) => {
        if (highlightedId && d.data.id === highlightedId) return "#F59E0B"; // Gold active ring
        if (highlightedId && isDescendant(highlightedId, d)) return "#6366F1"; // Subtree ring
        return "#1E1E2E";
      })
      .attr("stroke-width", (d: any) => {
        if (highlightedId && d.data.id === highlightedId) return 3;
        if (highlightedId && isDescendant(highlightedId, d)) return 2.5;
        return 1.5;
      });

    mergedNodes.transition()
      .duration(400)
      .attr("opacity", (d: any) => {
        if (!highlightedId) return 1;
        if (isDescendant(highlightedId, d)) return 1;
        return 0.15;
      });

    // Tooltip and Click logic
    mergedNodes.on("mouseover", (event, d: any) => {
      const tooltip = d3.select(tooltipRef.current);
      tooltip.style("display", "block")
        .html(`
          <div class="font-bold text-indigo-400 mb-1 border-b border-border pb-1 text-sm">${d.data.name}</div>
          <div class="space-y-1 mt-1.5">
            <div class="flex justify-between">
              <span class="text-text-muted pr-3">Node Type:</span>
              <span class="font-mono text-slate-300">${d.data.node_type}</span>
            </div>
            ${d.data.relation_name ? `
              <div class="flex justify-between">
                <span class="text-text-muted">Table:</span>
                <span class="text-emerald-400 font-mono">${d.data.relation_name}</span>
              </div>
            ` : ''}
            ${d.data.index_name ? `
              <div class="flex justify-between">
                <span class="text-text-muted">Index:</span>
                <span class="text-purple-400 font-mono">${d.data.index_name}</span>
              </div>
            ` : ''}
            <div class="flex justify-between">
              <span class="text-text-muted">Actual Time:</span>
              <span class="font-semibold text-warning">${d.data.actual_total_time.toFixed(3)} ms</span>
            </div>
            <div class="flex justify-between">
              <span class="text-text-muted">Actual Rows:</span>
              <span class="text-slate-300 font-mono">${d.data.actual_rows.toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-text-muted">Total Cost:</span>
              <span class="text-slate-300 font-mono">${d.data.cost.toFixed(2)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-text-muted">Loops:</span>
              <span class="text-slate-300 font-mono">${d.data.loops}</span>
            </div>
            ${d.data.filter ? `
              <div class="mt-2 pt-1 border-t border-border">
                <div class="text-text-muted text-[10px] mb-0.5">Filter:</div>
                <code class="text-rose-400 block break-words bg-slate-950 p-1 rounded border border-border/50 text-[10px] font-mono">${d.data.filter}</code>
              </div>
            ` : ''}
          </div>
        `);
    })
    .on("mousemove", (event) => {
      if (!containerRef.current || !tooltipRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      let x = event.clientX - containerRect.left + 15;
      let y = event.clientY - containerRect.top + 15;

      // Keep tooltip within horizontal limits
      if (x + tooltipRect.width > containerRect.width) {
        x = event.clientX - containerRect.left - tooltipRect.width - 15;
      }
      // Keep tooltip within vertical limits
      if (y + tooltipRect.height > containerRect.height) {
        y = event.clientY - containerRect.top - tooltipRect.height - 15;
      }

      d3.select(tooltipRef.current)
        .style("left", `${x}px`)
        .style("top", `${y}px`);
    })
    .on("mouseout", () => {
      d3.select(tooltipRef.current).style("display", "none");
    })
    .on("click", (event, d: any) => {
      event.stopPropagation();
      setHighlightedId(prev => (prev === d.data.id ? null : d.data.id));
    });

    // Clear click highlight when clicking on empty SVG space
    svg.on("click", () => {
      setHighlightedId(null);
    });

    nodes.exit().remove();
  }, [processedData, highlightedId]);

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(400)
      .call(zoomRef.current.transform, d3.zoomIdentity);
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-[500px] border border-border bg-background rounded-xl overflow-hidden shadow-inner flex items-center justify-center group"
    >
      <button
        onClick={handleResetZoom}
        className="absolute top-3 right-3 p-2 bg-surface hover:bg-border border border-border text-foreground rounded-lg shadow-md hover:text-primary transition-all z-10 opacity-70 group-hover:opacity-100 flex items-center gap-1.5 text-xs font-medium"
        title="Reset Zoom"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Reset Zoom
      </button>

      <svg ref={svgRef} className="w-full h-full" />

      {/* Floating HTML tooltip */}
      <div
        ref={tooltipRef}
        className="absolute hidden pointer-events-none bg-surface border border-border text-foreground p-3.5 rounded-lg text-xs shadow-2xl z-20 w-72 backdrop-blur-md bg-opacity-95"
      />
    </div>
  );
}
