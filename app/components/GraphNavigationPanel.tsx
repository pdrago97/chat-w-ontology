import React, { useState, useEffect } from 'react';

interface GraphNavigationPanelProps {
  graphData: any;
  onFilterChange: (filters: GraphFilters) => void;
  onNodeFocus: (nodeId: string) => void;
}

interface GraphFilters {
  category: string;
  searchTerm: string;
  minConnections: number;
  showOnlyConnected: boolean;
}

const GraphNavigationPanel: React.FC<GraphNavigationPanelProps> = ({
  graphData,
  onFilterChange,
  onNodeFocus
}) => {
  const [filters, setFilters] = useState<GraphFilters>({
    category: 'all',
    searchTerm: '',
    minConnections: 0,
    showOnlyConnected: false
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [nodeStats, setNodeStats] = useState<any>({});

  // Extract categories and stats from graph data
  useEffect(() => {
    if (!graphData?.nodes) return;

    const categorySet = new Set<string>();
    const stats: any = {};

    graphData.nodes.forEach((node: any) => {
      const category = node.category || node.type || 'concept';
      categorySet.add(category);
      
      if (!stats[category]) {
        stats[category] = { count: 0, nodes: [] };
      }
      stats[category].count++;
      stats[category].nodes.push(node);
    });

    setCategories(['all', ...Array.from(categorySet).sort()]);
    setNodeStats(stats);
  }, [graphData]);

  // Notify parent of filter changes
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const updateFilter = (key: keyof GraphFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'person': return '👤';
      case 'company': return '🏢';
      case 'experience':
      case 'role': return '💼';
      case 'project': return '🚀';
      case 'technology':
      case 'skill': return '⚡';
      case 'education': return '🎓';
      case 'certification': return '🏆';
      case 'concept': return '💡';
      default: return '📄';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'person': return '#8B5CF6';
      case 'company': return '#3B82F6';
      case 'experience':
      case 'role': return '#10B981';
      case 'project': return '#F59E0B';
      case 'technology':
      case 'skill': return '#EF4444';
      case 'education': return '#14B8A6';
      case 'certification': return '#F97316';
      case 'concept': return '#6B7280';
      default: return '#6366F1';
    }
  };

  const handleNodeClick = (nodeId: string) => {
    onNodeFocus(nodeId);
  };

  return (
    <div className={`fixed top-4 left-4 z-50 transition-all duration-300 ${
      isExpanded ? 'w-80' : 'w-12'
    }`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-12 h-12 bg-white rounded-lg shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors mb-2"
        title={isExpanded ? 'Collapse Navigation' : 'Expand Navigation'}
      >
        <span className="text-lg">
          {isExpanded ? '✕' : '🧭'}
        </span>
      </button>

      {/* Navigation Panel */}
      {isExpanded && (
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-h-96 overflow-y-auto">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            📊 Knowledge Graph Navigation
          </h3>

          {/* Search */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔍 Search Nodes
            </label>
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => updateFilter('searchTerm', e.target.value)}
              placeholder="Search Pedro's experience..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Category Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📂 Filter by Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => updateFilter('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {getCategoryIcon(category)} {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                  {category !== 'all' && nodeStats[category] ? ` (${nodeStats[category].count})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Connection Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔗 Minimum Connections: {filters.minConnections}
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={filters.minConnections}
              onChange={(e) => updateFilter('minConnections', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Category Stats */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">📈 Category Overview</h4>
            <div className="space-y-1">
              {Object.entries(nodeStats).map(([category, stats]: [string, any]) => (
                <div
                  key={category}
                  className="flex items-center justify-between text-xs p-2 rounded hover:bg-gray-50 cursor-pointer"
                  onClick={() => updateFilter('category', category)}
                >
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: getCategoryColor(category) }}
                    />
                    <span>{getCategoryIcon(category)} {category}</span>
                  </div>
                  <span className="text-gray-500">{stats.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">⚡ Quick Focus</h4>
            <div className="space-y-1">
              <button
                onClick={() => handleNodeClick('Pedro Reichow')}
                className="w-full text-left text-xs p-2 rounded hover:bg-purple-50 text-purple-700"
              >
                👤 Focus on Pedro
              </button>
              <button
                onClick={() => updateFilter('category', 'company')}
                className="w-full text-left text-xs p-2 rounded hover:bg-blue-50 text-blue-700"
              >
                🏢 Show Companies
              </button>
              <button
                onClick={() => updateFilter('category', 'technology')}
                className="w-full text-left text-xs p-2 rounded hover:bg-red-50 text-red-700"
              >
                ⚡ Show Technologies
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphNavigationPanel;
