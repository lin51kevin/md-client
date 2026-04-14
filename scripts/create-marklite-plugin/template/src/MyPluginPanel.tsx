import React from 'react';

interface MyPluginPanelProps {
  pluginName: string;
}

export const MyPluginPanel: React.FC<MyPluginPanelProps> = ({ pluginName }) => {
  return (
    <div className="my-plugin-panel">
      <h2>{pluginName}</h2>
      <p>插件面板已加载。在此处构建你的 UI。</p>
    </div>
  );
};
