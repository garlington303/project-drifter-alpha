import React, { useState } from 'react';
import './TabMenu.css';

interface TabMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'Character' | 'Skills' | 'Map' | 'Journal';

interface SkillNodeData {
  id: string;
  x: number; // Percent 0-100
  y: number; // Percent 0-100
  label: string;
  icon: string; // Placeholder char
  parents: string[]; // IDs of parent nodes
}

const SKILL_TREE_DATA: SkillNodeData[] = [
  { id: 'survivor', x: 50, y: 80, label: 'Survivor', icon: '⚓', parents: [] },
  { id: 'force', x: 35, y: 60, label: 'Force', icon: '⚔️', parents: ['survivor'] },
  { id: 'vitality', x: 65, y: 60, label: 'Vitality', icon: '❤️', parents: ['survivor'] },
  { id: 'agility', x: 50, y: 45, label: 'Agility', icon: '⚡', parents: ['force', 'vitality'] },
  { id: 'drifter', x: 50, y: 20, label: 'Drifter', icon: '👁️', parents: ['agility'] },
];

const TabMenu: React.FC<TabMenuProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('Character');

  if (!isOpen) return null;

  const renderSkills = () => {
    return (
      <div className="skill-tree-container">
        {/* SVG Layer for lines */}
        <svg className="skill-connections">
          {SKILL_TREE_DATA.map(node => {
            return node.parents.map(parentId => {
              const parent = SKILL_TREE_DATA.find(n => n.id === parentId);
              if (!parent) return null;
              return (
                <line
                  key={`${parentId}-${node.id}`}
                  x1={`${parent.x}%`}
                  y1={`${parent.y}%`}
                  x2={`${node.x}%`}
                  y2={`${node.y}%`}
                  className="connection-line"
                />
              );
            });
          })}
        </svg>

        {/* Node Layer */}
        {SKILL_TREE_DATA.map(node => (
          <div
            key={node.id}
            className={`skill-node ${node.id === 'survivor' ? 'unlocked' : ''}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <span className="skill-icon">{node.icon}</span>
            <span className="skill-label">{node.label}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Character':
        return <div className="placeholder-text">Equipment & Stats</div>;
      case 'Skills':
        return renderSkills();
      case 'Map':
        return <div className="placeholder-text">Cartography</div>;
      case 'Journal':
        return <div className="placeholder-text">Chronicles</div>;
      default:
        return null;
    }
  };

  return (
    <div className="rpg-overlay" onClick={onClose}>
      {/* Stop click propagation so clicking inside the window doesn't close it */}
      <div className="rpg-window" onClick={(e) => e.stopPropagation()}>
        
        {/* Navigation Tabs */}
        <div className="rpg-header">
          {(['Character', 'Skills', 'Map', 'Journal'] as TabType[]).map((tab) => (
            <button
              key={tab}
              className={`rpg-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="rpg-content">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="rpg-footer">
          <span>Project Drifter</span>
          <span>Early Access v0.2.1</span>
        </div>

      </div>
    </div>
  );
};

export default TabMenu;