'use client';

import React, { useState } from 'react';
import { Folder, FileCode, ChevronRight, ChevronDown, Plus, Save, User, Settings, LogOut } from 'lucide-react';

// Емуляція даних дерева
const initialTreeData = [
  {
    id: 1,
    title: 'Frontend Development',
    isOpen: true,
    children: [
      { id: 2, title: 'React Hooks', type: 'note' },
      { id: 3, title: 'Tailwind Grid', type: 'note' },
    ]
  },
  {
    id: 4,
    title: 'Backend Logic',
    isOpen: false,
    children: [
      { id: 5, title: 'API Authentication', type: 'note' }
    ]
  }
];

export default function LearningTreeApp() {
  const [tree, setTree] = useState(initialTreeData);
  const [activeNote, setActiveNote] = useState({ title: 'React Hooks', content: 'useEffect використовується для...' });
  
  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* SIDEBAR: TREE NAVIGATION */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        {/* App Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h1 className="font-bold text-lg text-indigo-600">DevTree 🌳</h1>
          <button className="p-1 hover:bg-slate-100 rounded"><Settings size={16} /></button>
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-xs font-semibold text-slate-400 uppercase mb-2 px-2">Мої знання</div>
          
          {tree.map(node => (
            <div key={node.id} className="mb-1">
              <div className="flex items-center px-2 py-1.5 hover:bg-indigo-50 rounded cursor-pointer text-sm font-medium text-slate-700">
                {node.isOpen ? <ChevronDown size={16} className="mr-1 text-slate-400" /> : <ChevronRight size={16} className="mr-1 text-slate-400" />}
                <Folder size={16} className="mr-2 text-indigo-500" />
                {node.title}
              </div>
              
              {/* Children (Sub-topics) */}
              {node.isOpen && node.children && (
                <div className="ml-6 border-l border-slate-200 pl-2 mt-1">
                  {node.children.map(child => (
                    <div key={child.id} className={`flex items-center px-2 py-1.5 rounded cursor-pointer text-sm mb-1 ${child.title === activeNote.title ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-600'}`}>
                      <FileCode size={14} className="mr-2 opacity-70" />
                      {child.title}
                    </div>
                  ))}
                  <button className="flex items-center text-xs text-slate-400 hover:text-indigo-600 mt-2 px-2">
                    <Plus size={12} className="mr-1" /> Додати тему
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* User Profile (Bottom Sidebar) */}
        <div className="p-4 border-t border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">U</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">User Name</p>
            <p className="text-xs text-slate-500 truncate">user@gmail.com</p>
          </div>
          <LogOut size={16} className="text-slate-400 hover:text-red-500 cursor-pointer" />
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Bar */}
        <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6">
          <div className="flex items-center text-sm text-slate-500">
            Frontend Development <ChevronRight size={14} className="mx-2" /> <span className="text-slate-900 font-medium">React Hooks</span>
          </div>
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors">
            <Save size={16} /> Зберегти
          </button>
        </header>

        {/* Content Editor Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Title Input */}
            <input 
              type="text" 
              value={activeNote.title}
              className="w-full text-3xl font-bold text-slate-800 border-none focus:ring-0 placeholder-slate-300 bg-transparent p-0"
              placeholder="Назва теми..."
            />

            {/* Description (Text Area / Markdown) */}
            <textarea 
              className="w-full h-32 p-4 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none text-slate-600 leading-relaxed"
              placeholder="Опишіть концепцію тут..."
              defaultValue="React Hooks дозволяють використовувати стан та інші можливості React без написання класів."
            ></textarea>

            {/* MONACO EDITOR CONTAINER */}
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-[#1e1e1e]">
              <div className="bg-[#2d2d2d] px-4 py-2 flex justify-between items-center border-b border-[#3e3e3e]">
                <span className="text-xs text-slate-400 font-mono">example.jsx</span>
                <span className="text-xs text-indigo-400 font-mono cursor-pointer">Copy code</span>
              </div>
              {/* Тут буде реальний Monaco Editor */}
              <div className="p-4 font-mono text-sm">
                <div className="text-blue-400">import</div> <div className="text-white inline">React, &#123; useState &#125;</div> <div className="text-blue-400 inline">from</div> <div className="text-[#ce9178] inline">'react'</div>;
                <br /><br />
                <div className="text-blue-400">function</div> <div className="text-[#dcdcaa] inline">Example</div>() &#123;
                <br />
                &nbsp;&nbsp;<div className="text-blue-400">const</div> [count, setCount] = <div className="text-[#dcdcaa]">useState</div>(0);
                <br />
                &#125;
              </div>
              <div className="bg-[#1e1e1e] h-4"></div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}