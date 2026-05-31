/* Vega Sankey for Revenue
   Plain JavaScript computes the layout; Vega renders the chart.
*/
(function () {
  const containerSelector = '#revenue-chart';
  const travisName = 'Travis Scott';
  const categoryOrder = ['Music', 'Live Touring', 'Brand Partnerships', 'Merchandise', 'Entertainment & Media'];
  const categoryColors = {
    Music: '#5b457e',
    'Live Touring': '#6a369d',
    'Brand Partnerships': '#7f59aa',
    Merchandise: '#a077c6',
    'Entertainment & Media': '#b79bd7'
  };

  let templateCache = null;
  let csvCache = null;
  let renderPromise = null;
  let currentView = null;

  function debounce(fn, wait) {
    let timer = null;
    return function () {
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(null, args);
      }, wait);
    };
  }

  function parseCsv(text) {
    const lines = String(text || '').trim().split(/\r?\n/);
    const rows = [];
    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(',');
      if (parts.length < 3) continue;
      const source = parts[0].trim();
      const target = parts[1].trim();
      const value = Number(parts.slice(2).join(',').trim()) || 0;
      rows.push({ source, target, value });
    }
    return rows;
  }

  async function loadTemplate() {
    if (templateCache) return templateCache;
    const response = await fetch('js/revenue.json?t=' + Date.now(), { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Failed to fetch revenue.json: ' + response.status);
    }
    templateCache = await response.json();
    return templateCache;
  }

  async function loadRows() {
    if (csvCache) return csvCache;
    const response = await fetch('data/revenue.csv?t=' + Date.now(), { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Failed to fetch revenue.csv: ' + response.status);
    }
    csvCache = parseCsv(await response.text());
    return csvCache;
  }

  function createNode(name, type, categoryKey, value) {
    return {
      name,
      type,
      category_key: categoryKey,
      value: value || 0,
      x0: 0,
      x1: 0,
      y0: 0,
      y1: 0
    };
  }

  function buildModel(rows, width, height) {
    const sourceTotals = new Map();
    const sourceCategory = new Map();
    const categoryIncoming = new Map();
    const categoryOutgoing = new Map();
    const categoryRows = [];

    categoryOrder.forEach(function (name) {
      categoryIncoming.set(name, 0);
      categoryOutgoing.set(name, 0);
    });

    rows.forEach(function (row) {
      if (row.target === travisName) {
        // rows like: <Category> -> Travis
        categoryRows.push(row);
        categoryOutgoing.set(row.source, (categoryOutgoing.get(row.source) || 0) + row.value);
        return;
      }

      // rows like: <Source> -> <Category>
      sourceTotals.set(row.source, (sourceTotals.get(row.source) || 0) + row.value);
      sourceCategory.set(row.source, row.target);
      categoryIncoming.set(row.target, (categoryIncoming.get(row.target) || 0) + row.value);
    });

    const sourceNodes = Array.from(sourceTotals.keys()).map(function (name) {
      const categoryKey = sourceCategory.get(name) || 'Other';
      return createNode(name, 'source', categoryKey, sourceTotals.get(name) || 0);
    });

    sourceNodes.sort(function (a, b) {
      if ((b.value || 0) !== (a.value || 0)) return (b.value || 0) - (a.value || 0);
      return a.name.localeCompare(b.name);
    });

    const categoryNodes = categoryOrder.map(function (name) {
      // node height equals total incoming flow so incoming ribbons fully occupy the bar
      const incoming = categoryIncoming.get(name) || 0;
      return createNode(name, 'category', name, incoming);
    }).sort(function (a, b) {
      if ((b.value || 0) !== (a.value || 0)) return (b.value || 0) - (a.value || 0);
      return a.name.localeCompare(b.name);
    });

    const travisNode = createNode(travisName, 'travis', 'ALL', categoryRows.reduce(function (sum, row) {
      return sum + row.value;
    }, 0));

    const nodeWidth = 22; // slightly reduced width for better proportion
    const sourceGap = 18; // increased spacing between source bars
    const categoryGap = 30;
    const travisGap = 0;
    const marginX = 92;
    const marginY = 36; // slightly more vertical margin to keep centered
    const sourceX = marginX;
    const categoryX = width / 2 - nodeWidth / 2;
    const travisX = width - marginX - nodeWidth;
    const availableHeight = height - 2 * marginY;

    function columnScale(nodes, gap) {
      const total = nodes.reduce(function (sum, node) {
        return sum + (node.value || 0);
      }, 0);
      if (!total) return 1;
      const gapTotal = Math.max(0, nodes.length - 1) * gap;
      return Math.max(0.0001, (availableHeight - gapTotal) / total);
    }

    const baseScale = Math.min(
      columnScale(sourceNodes, sourceGap),
      columnScale(categoryNodes, categoryGap),
      columnScale([travisNode], travisGap)
    );
    const scaleMultiplier = 1.15; // slightly reduced multiplier for smaller visuals
    const scale = baseScale * scaleMultiplier;

    function stackColumn(nodes, x0, gap) {
      const totalHeight = nodes.reduce(function (sum, node) {
        return sum + (node.value || 0) * scale;
      }, 0) + Math.max(0, nodes.length - 1) * gap;
      let cursorY = marginY + Math.max(0, (availableHeight - totalHeight) / 2);
      nodes.forEach(function (node) {
        const nodeHeight = Math.max(1, (node.value || 0) * scale);
        node.x0 = x0;
        node.x1 = x0 + nodeWidth;
        node.y0 = cursorY;
        node.y1 = cursorY + nodeHeight;
        cursorY = node.y1 + gap;
      });
    }

    stackColumn(sourceNodes, sourceX, sourceGap);
    stackColumn(categoryNodes, categoryX, categoryGap);
    stackColumn([travisNode], travisX, travisGap);

    const nodes = sourceNodes.concat(categoryNodes, [travisNode]);
    const nodeByName = new Map(nodes.map(function (node) {
      return [node.name, node];
    }));

    const links = rows.map(function (row) {
      const sourceNode = nodeByName.get(row.source);
      const targetNode = nodeByName.get(row.target);
      const categoryKey = row.target === travisName ? row.source : row.target;
      return {
        sourceName: row.source,
        targetName: row.target,
        sourceNode,
        targetNode,
        category_key: categoryKey,
        value: row.value,
        thickness: row.value * scale,
        fill: categoryColors[categoryKey] || '#9e9e9e'
      };
    });

    const outMap = new Map();
    const inMap = new Map();

    links.forEach(function (link) {
      if (!outMap.has(link.sourceName)) outMap.set(link.sourceName, []);
      if (!inMap.has(link.targetName)) inMap.set(link.targetName, []);
      outMap.get(link.sourceName).push(link);
      inMap.get(link.targetName).push(link);
    });

    function sortBySourceY(a, b) {
      const ay = a && a.sourceNode ? a.sourceNode.y0 : 0;
      const by = b && b.sourceNode ? b.sourceNode.y0 : 0;
      return ay - by;
    }

    outMap.forEach(function (arr) {
      arr.sort(sortBySourceY);
    });
    inMap.forEach(function (arr) {
      arr.sort(sortBySourceY);
    });

    nodes.forEach(function (node) {
      let outOffset = 0;
      const outLinks = outMap.get(node.name) || [];
      outLinks.forEach(function (link) {
        link.sourceOffset = outOffset;
        outOffset += link.thickness;
      });

      let inOffset = 0;
      const inLinks = inMap.get(node.name) || [];
      inLinks.forEach(function (link) {
        link.targetOffset = inOffset;
        inOffset += link.thickness;
      });
    });

    links.forEach(function (link) {
      const x0 = link.sourceNode.x1;
      const x1 = link.targetNode.x0;
      const y0Top = link.sourceNode.y0 + (link.sourceOffset || 0);
      const y0Bottom = y0Top + link.thickness;
      const y1Top = link.targetNode.y0 + (link.targetOffset || 0);
      const y1Bottom = y1Top + link.thickness;
      const cp1x = x0 + (x1 - x0) * 0.42;
      const cp2x = x0 + (x1 - x0) * 0.58;
      link.path = [
        'M' + x0 + ',' + y0Top,
        'C' + cp1x + ',' + y0Top + ' ' + cp2x + ',' + y1Top + ' ' + x1 + ',' + y1Top,
        'L' + x1 + ',' + y1Bottom,
        'C' + cp2x + ',' + y1Bottom + ' ' + cp1x + ',' + y0Bottom + ' ' + x0 + ',' + y0Bottom,
        'Z'
      ].join(' ');
    });

    return {
      nodes: nodes,
      links: links,
      width: width,
      height: height
    };
  }

  function cloneTemplate(template) {
    return JSON.parse(JSON.stringify(template));
  }

  function ensureRibbonLayer(container, width, height) {
    let ribbonLayer = container.querySelector('.revenue-ribbon-layer');
    if (!ribbonLayer) {
      ribbonLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      ribbonLayer.classList.add('revenue-ribbon-layer');
      ribbonLayer.setAttribute('aria-hidden', 'true');
      ribbonLayer.setAttribute('preserveAspectRatio', 'none');
      container.appendChild(ribbonLayer);
    }
    ribbonLayer.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    ribbonLayer.setAttribute('width', String(width));
    ribbonLayer.setAttribute('height', String(height));
    ribbonLayer.style.width = width + 'px';
    ribbonLayer.style.height = height + 'px';
    ribbonLayer.innerHTML = '';
    return ribbonLayer;
  }

  function renderRibbons(container, model, width, height) {
    const ribbonLayer = ensureRibbonLayer(container, width, height);
    model.links.forEach(function (link) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', link.path);
      path.setAttribute('fill', link.fill);
      path.setAttribute('stroke', link.fill);
      path.setAttribute('stroke-width', '0.95');
      path.setAttribute('fill-opacity', '0.9');
      path.setAttribute('stroke-opacity', '0.95');
      ribbonLayer.appendChild(path);
    });
  }

  async function render() {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const template = await loadTemplate();
    const rows = await loadRows();
    const width = Math.max(760, container.clientWidth || 900);
    const height = 620;
    const model = buildModel(rows, width, height);

    const spec = cloneTemplate(template);
    spec.width = width;
    spec.height = height;
    spec.background = 'transparent';
    spec.data = [
      { name: 'links', values: model.links },
      { name: 'nodes', values: model.nodes }
    ];

    if (currentView && typeof currentView.finalize === 'function') {
      try {
        currentView.finalize();
      } catch (e) {
        // ignore
      }
      currentView = null;
    }

    container.innerHTML = '';
    container.style.position = 'relative';
    container.style.overflow = 'hidden';

    // create ribbon layer now but we'll move it into Vega's SVG after embed
    renderRibbons(container, model, width, height);

    const viewHost = document.createElement('div');
    viewHost.className = 'revenue-vega-layer';
    container.appendChild(viewHost);

    const result = await vegaEmbed(viewHost, spec, {
      actions: false,
      renderer: 'svg'
    });
    currentView = result.view;

    // move the ribbon SVG into Vega's root SVG so they share the exact same coordinate space
    try {
      const vegaSvg = viewHost.querySelector('svg');
      const ribbonLayer = container.querySelector('.revenue-ribbon-layer');
      if (vegaSvg && ribbonLayer) {
        // remove from container and append as first child of Vega SVG root <g> or directly into svg
        ribbonLayer.parentNode && ribbonLayer.parentNode.removeChild(ribbonLayer);
        // ensure ribbon uses same viewBox/size as Vega's svg
        ribbonLayer.setAttribute('viewBox', '0 0 ' + spec.width + ' ' + spec.height);
        ribbonLayer.setAttribute('width', String(spec.width));
        ribbonLayer.setAttribute('height', String(spec.height));
        ribbonLayer.style.width = '100%';
        ribbonLayer.style.height = '100%';
        // insert before the first child so ribbons appear beneath node marks
        vegaSvg.insertBefore(ribbonLayer, vegaSvg.firstChild);
      }
    } catch (e) {
      console.warn('Could not move ribbon layer into Vega SVG', e);
    }
  }

  function destroy() {
    if (currentView && typeof currentView.finalize === 'function') {
      try {
        currentView.finalize();
      } catch (e) {
        // ignore
      }
    }
    currentView = null;
  }

  function init() {
    if (renderPromise) return renderPromise;
    renderPromise = render().catch(function (err) {
      const container = document.querySelector(containerSelector);
      if (container) {
        container.innerHTML = '<div style="color:red;padding:12px;font-family:Arial">Failed to load revenue.csv: ' + err.message + '</div>';
      }
      console.error(err);
      throw err;
    }).finally(function () {
      renderPromise = null;
    });
    return renderPromise;
  }

  const scheduleRender = debounce(function () {
    init().catch(function () {
      // error already handled
    });
  }, 150);

  window.RevenueSankey = {
    init: init,
    destroy: destroy,
    render: render
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      init();
    });
  } else {
    init();
  }

  window.addEventListener('resize', scheduleRender);
})();
