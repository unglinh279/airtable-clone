"use client";

import { api } from "~/utils/api"; // tRPC client setup
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Search, Bell, CircleHelp, Plus, ChevronDown, GridIcon, List } from 'lucide-react';
import { useState } from "react";

export default function BasePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const { data: bases, refetch } = api.base.getAll.useQuery();

  const [viewType, setViewType] = useState("grid");

  const createBase = api.base.create.useMutation({
    onSuccess: () => refetch(),
  });

  // Handle base creation
  const handleCreateBase = async () => {
    const name = prompt("Enter a name for the base:");
    if (name) {
      await createBase.mutateAsync({ name });
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="loader"></div>
      </div>
    );
  }

  if (!session?.user) {
    router.push("/api/auth/signin");
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-gray-100 rounded">
              <img
                src="https://img.icons8.com/?size=100&id=3096&format=png&color=000000"
                className="w-5 h-5 group-hover:hidden"
              />
            </button>
            <div className="flex items-center">
              <img
                src="https://img.icons8.com/?size=100&id=elyFOMuEo0iE&format=png&color=000000"
                className="w-8 h-8 group-hover:hidden"
              />
              <span className="ml-2 font-semibold text-gray-900">Airtable</span>
            </div>
          </div>

          <div className="flex-1 flex justify-center">
            <div className="flex items-center bg-white border border-gray-300 rounded-full px-4 py-1.5 w-96">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="ml-2 bg-transparent outline-none w-full text-sm"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-gray-100 rounded">
              <CircleHelp className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded">
              <Bell className="w-5 h-5 text-gray-600" />
            </button>
            <button className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center">
              {session?.user?.name?.[1]?.toLocaleUpperCase() ?? 'U'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <div className="w-16 border-r border-gray-200 h-screen flex flex-col items-center pt-4">
          <button className="p-2 hover:bg-gray-100 rounded mb-4">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-8">
          <h1 className="text-2xl font-bold mb-6">Home</h1>

          {/* Quick Start Options */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div onClick={handleCreateBase} className="p-4 border rounded-lg hover:border-purple-200 cursor-pointer">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-purple-50 rounded">
                  <svg className="w-5 h-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                </div>
              </div>
              <h3 className="font-semibold mb-2">Start with AI</h3>
              <p className="text-sm text-gray-600">Turn your process into an app with data and interfaces using AI.</p>
            </div>
            <div onClick={handleCreateBase} className="p-4 border rounded-lg hover:border-blue-200 cursor-pointer">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-50 rounded">
                  <svg className="w-5 h-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                  </svg>
                </div>
              </div>
              <h3 className="font-semibold mb-2">Start with templates</h3>
              <p className="text-sm text-gray-600">Select a template to get started and customize as you go.</p>
            </div>
            <div onClick={handleCreateBase} className="p-4 border rounded-lg hover:border-green-200 cursor-pointer">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-green-50 rounded">
                  <svg className="w-5 h-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <h3 className="font-semibold mb-2">Quickly upload</h3>
              <p className="text-sm text-gray-600">Easily migrate your existing projects in just a few minutes.</p>
            </div>
            <div onClick={handleCreateBase} className="p-4 border rounded-lg hover:border-gray-300 cursor-pointer">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-gray-50 rounded">
                  <Plus className="w-5 h-5 text-gray-600" />
                </div>
              </div>
              <h3 className="font-semibold mb-2">Start from scratch</h3>
              <p className="text-sm text-gray-600">Create a new blank base with custom tables, fields, and views.</p>
            </div>
          </div>

          {/* Recent Bases Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <button className="flex items-center space-x-1 text-gray-700 px-2 py-1 rounded">
                  <span>Opened by you</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button className="flex items-center space-x-1 text-gray-700 px-2 py-1 rounded">
                  <span>Show all types</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewType('grid')}
                  className={`p-1.5 rounded hover:bg-gray-100 ${viewType === 'grid' ? 'bg-gray-100' : ''}`}
                >
                  <GridIcon className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => setViewType('list')}
                  className={`p-1.5 rounded hover:bg-gray-100 ${viewType === 'list' ? 'bg-gray-100' : ''}`}
                >
                  <List className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="mb-2 text-sm text-gray-500">Today</div>


            {/* Bases Grid/List */}
            <div className={viewType === 'grid' ? 'grid grid-cols-3 gap-4' : 'space-y-2'}>
              {bases?.map((base) => (
                <div
                  key={base.id}
                  onClick={() => router.push(`/${base.id}/${base.tables[0]?.id}`)}
                  className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-500 rounded flex items-center justify-center text-white font-semibold mr-3">
                      {base.name.slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-medium">{base.name}</h3>
                      <p className="text-sm text-gray-600">Base</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
