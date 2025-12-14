'use client';

import {
  ChevronDown,
  ChevronRight,
  FileCode,
  Folder,
  LogOut,
  Plus,
  Save,
  Settings,
  User,
} from 'lucide-react';
import React, { useState } from 'react';

// Емуляція даних дерева
const initialTreeData = [
  {
    id: 1,
    title: 'Frontend Development',
    isOpen: true,
    children: [
      { id: 2, title: 'React Hooks', type: 'note' },
      { id: 3, title: 'Tailwind Grid', type: 'note' },
    ],
  },
  {
    id: 4,
    title: 'Backend Logic',
    isOpen: false,
    children: [{ id: 5, title: 'API Authentication', type: 'note' }],
  },
];

export default function LearningTreeApp() {
  const [tree, setTree] = useState(initialTreeData);
  const [activeNote, setActiveNote] = useState({
    title: 'React Hooks',
    content: 'useEffect використовується для...',
  });

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      {/* SIDEBAR: TREE NAVIGATION */}
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
        {/* App Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h1 className="text-lg font-bold text-indigo-600">DevTree 🌳</h1>
          <button className="rounded p-1 hover:bg-slate-100">
            <Settings size={16} />
          </button>
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="mb-2 px-2 text-xs font-semibold text-slate-400 uppercase">
            Мої знання
          </div>

          {tree.map((node) => (
            <div key={node.id} className="mb-1">
              <div className="flex cursor-pointer items-center rounded px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-indigo-50">
                {node.isOpen ? (
                  <ChevronDown size={16} className="mr-1 text-slate-400" />
                ) : (
                  <ChevronRight size={16} className="mr-1 text-slate-400" />
                )}
                <Folder size={16} className="mr-2 text-indigo-500" />
                {node.title}
              </div>

              {/* Children (Sub-topics) */}
              {node.isOpen && node.children && (
                <div className="mt-1 ml-6 border-l border-slate-200 pl-2">
                  {node.children.map((child) => (
                    <div
                      key={child.id}
                      className={`mb-1 flex cursor-pointer items-center rounded px-2 py-1.5 text-sm ${child.title === activeNote.title ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      <FileCode size={14} className="mr-2 opacity-70" />
                      {child.title}
                    </div>
                  ))}
                  <button className="mt-2 flex items-center px-2 text-xs text-slate-400 hover:text-indigo-600">
                    <Plus size={12} className="mr-1" /> Додати тему
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* User Profile (Bottom Sidebar) */}
        <div className="flex items-center gap-3 border-t border-slate-100 p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
            U
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">User Name</p>
            <p className="truncate text-xs text-slate-500">user@gmail.com</p>
          </div>
          <LogOut
            size={16}
            className="cursor-pointer text-slate-400 hover:text-red-500"
          />
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex h-full flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex items-center text-sm text-slate-500">
            Frontend Development <ChevronRight size={14} className="mx-2" />{' '}
            <span className="font-medium text-slate-900">React Hooks</span>
          </div>
          <button className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700">
            <Save size={16} /> Зберегти
          </button>
        </header>

        {/* Content Editor Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Title Input */}
            <input
              type="text"
              value={activeNote.title}
              className="w-full border-none bg-transparent p-0 text-3xl font-bold text-slate-800 placeholder-slate-300 focus:ring-0"
              placeholder="Назва теми..."
            />

            {/* Description (Text Area / Markdown) */}
            <textarea
              className="h-32 w-full resize-none rounded-lg border border-slate-200 p-4 leading-relaxed text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Опишіть концепцію тут..."
              defaultValue="React Hooks дозволяють використовувати стан та інші можливості React без написання класів."
            ></textarea>

            {/* MONACO EDITOR CONTAINER */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-[#1e1e1e] shadow-sm">
              <div className="flex items-center justify-between border-b border-[#3e3e3e] bg-[#2d2d2d] px-4 py-2">
                <span className="font-mono text-xs text-slate-400">
                  example.jsx
                </span>
                <span className="cursor-pointer font-mono text-xs text-indigo-400">
                  Copy code
                </span>
              </div>
              {/* Тут буде реальний Monaco Editor */}
              <div className="p-4 font-mono text-sm">
                <div className="text-blue-400">import</div>{' '}
                <div className="inline text-white">
                  React, &#123; useState &#125;
                </div>{' '}
                <div className="inline text-blue-400">from</div>{' '}
                <div className="inline text-[#ce9178]">'react'</div>;
                <br />
                <br />
                <div className="text-blue-400">function</div>{' '}
                <div className="inline text-[#dcdcaa]">Example</div>() &#123;
                <br />
                &nbsp;&nbsp;<div className="text-blue-400">const</div> [count,
                setCount] = <div className="text-[#dcdcaa]">useState</div>(0);
                <br />
                &#125;
              </div>
              <div className="h-4 bg-[#1e1e1e]"></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
