"use client";

import React, { useState, useEffect } from "react";
import { HiOutlineClock } from "react-icons/hi";
import { FaQuestionCircle, FaUserCircle } from "react-icons/fa";
import { BsBell, BsShareFill } from "react-icons/bs";
import Link from "next/link";

import { api } from "~/utils/api";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";

import TableGrid from "~/app/components/TableGrid";

export default function TablePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { baseId: rawBaseId, tableId: rawTableId } = useParams();

    const baseId = Array.isArray(rawBaseId) ? rawBaseId[0] : rawBaseId;
    const tableId = Array.isArray(rawTableId) ? rawTableId[0] : rawTableId;

    const [currentTableId, setCurrentTableId] = useState<string | null>(tableId ?? null);

    // Fetch base data
    const { data: base, isLoading, error } = api.base.getBase.useQuery(
        { baseId: baseId! }, // Use non-null assertion since we check `baseId` below
        { enabled: !!baseId, refetchOnWindowFocus: false }
    );

    // Mutation to create a new table
    const createTable = api.table.create.useMutation({
        onSuccess: () => refetchBase(),
    });

    // Refetch base data
    const refetchBase = api.base.getBase.useQuery({ baseId: baseId! }).refetch;

    // Handle Table ID change and redirect
    useEffect(() => {
        if (currentTableId && currentTableId !== tableId) {
            router.push(`/${baseId}/${currentTableId}`);
        }
    }, [currentTableId, tableId, baseId, router]);

    // Set the current table ID and update the document title
    useEffect(() => {
        if (base?.tables?.length && !currentTableId) {
            setCurrentTableId(base.tables[0]?.id ?? null);
        }

        if (base && currentTableId) {
            const currentTable = base.tables.find((table) => table.id === currentTableId);
            if (currentTable) {
                document.title = `${base.name}: ${currentTable.name} - Airtable Clone`;
            }
        } else if (base) {
            document.title = `${base.name} - Airtable Clone`;
        }
    }, [base, currentTableId]);

    // Handle adding a new table
    const handleAddTable = async () => {
        try {
            // Ensure `base` and `base.tables` are defined
            if (!base || !base.tables) {
                throw new Error("Base data is not available");
            }

            // Safely access `base.tables.length`
            const newTableName = `Table ${base.tables.length + 1}`;
            const newTable = await createTable.mutateAsync({
                name: newTableName,
                baseId: baseId!,
            });

            setCurrentTableId(newTable.id); // Automatically switch to the new table
        } catch (error) {
            console.error("Failed to add table:", error);
        }
    };

    // Early return if `baseId` or `tableId` is invalid
    if (!baseId || !tableId) {
        return <div>Invalid base or table ID</div>;
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-gray-600">Loading...</div>
            </div>
        );
    }

    // Error state
    if (error || !base) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-red-600">Error: {error?.message ?? "Failed to load base data"}</div>
            </div>
        );
    }

    // Render the main UI
    return (
        <div className="flex flex-col h-screen">
            {/* Top Navigation */}
            <nav className="bg-airtableBlue text-white px-6 py-2 flex justify-between items-center shadow-md">
                {/* Left Section */}
                <div className="flex items-center space-x-6">
                    {/* Logo and Base Title */}
                    <div className="flex items-center space-x-2">
                        {/* Logo */}
                        <div
                            className="relative w-10 h-10 flex items-center justify-center cursor-pointer group"
                            onClick={() => router.push("/")}
                        >
                            {/* Default Logo */}
                            <img
                                src="https://img.icons8.com/?size=100&id=110899&format=png&color=ffffff"
                                alt="Logo"
                                className="w-6 h-6 group-hover:hidden"
                            />

                            {/* Back Arrow */}
                            <div className="absolute inset-0 flex items-center justify-center bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-4 h-4 text-black"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Base Title with Dropdown */}
                        <button className="flex items-center text-white font-medium text-lg space-x-1">
                            <span>{base.name}</span>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>

                    {/* Navigation Links */}
                    <div className="flex items-center space-x-4">
                        <button className="px-3 py-1 bg-blue-700 rounded-full text-sm font-medium hover:bg-blue-800">
                            Data
                        </button>
                        <button className="px-3 py-1 rounded-full text-sm hover:bg-blue-800 hover:bg-opacity-30">
                            Automations
                        </button>
                        <button className="px-3 py-1 rounded-full text-sm hover:bg-blue-800 hover:bg-opacity-30">
                            Interfaces
                        </button>
                        <div className="border-l border-white h-5"></div>
                        <button className="px-3 py-1 rounded-full text-sm hover:bg-blue-800 hover:bg-opacity-30">
                            Forms
                        </button>
                    </div>
                </div>

                {/* Right Section */}
                <div className="flex items-center space-x-4">
                    {/* Edit History Button */}
                    <button className="flex items-center space-x-2 px-3 py-1 rounded-full hover:bg-blue-800 hover:bg-opacity-30">
                        <HiOutlineClock className="w-5 h-5" />
                    </button>

                    {/* Help Button */}
                    <button className="flex items-center space-x-2 px-3 py-1 rounded-full hover:bg-blue-800 hover:bg-opacity-30">
                        <FaQuestionCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Help</span>
                    </button>

                    {/* Share Button */}
                    <button className="flex items-center bg-white text-airtableBlue px-3 py-1 rounded-full hover:bg-gray-100">
                        <BsShareFill className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">Share</span>
                    </button>

                    {/* Notification Bell */}
                    <button className="flex items-center bg-white text-airtableBlue w-8 h-8 rounded-full hover:bg-gray-100 justify-center">
                        <BsBell className="w-4 h-4" />
                    </button>

                    {/* User Account */}
                    <Link
                        href={session ? "/api/auth/signout" : "/api/auth/signin"}
                        className="flex items-center text-white hover:opacity-80"
                    >
                        {session ? "Sign out" : "Sign in"}
                    </Link>

                    <button className="flex items-center text-white hover:opacity-80">
                        <FaUserCircle className="w-6 h-6" />
                    </button>
                </div>
            </nav>

            {/* Section Below Navbar */}
            <div className="bg-airtableDarkBlue text-white flex justify-between items-center h-10">
                {/* Left Section */}
                <div className="flex items-center h-full">
                    {base.tables.map((table) => (
                        <button
                            key={table.id}
                            onClick={() => setCurrentTableId(table.id)}
                            className={`flex items-center px-3 py-1 rounded-t ${currentTableId === table.id ? "bg-white text-black shadow-md" : "hover:bg-blue-500"
                                }`}
                        >
                            <span>{table.name}</span>
                        </button>
                    ))}

                    {/* Add New Table Button */}
                    <button
                        onClick={handleAddTable}
                        className="flex items-center space-x-2 px-3 py-1 rounded-md bg-blue-700 text-white hover:bg-blue-800"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add Table</span>
                    </button>
                </div>

                {/* Right Section */}
                <div className="flex items-center space-x-4">
                    {/* Extensions */}
                    <button className="px-3 py-1 rounded-md hover:bg-blue-800 hover:bg-opacity-30">
                        Extensions
                    </button>

                    {/* Tools Dropdown */}
                    <button className="flex items-center px-3 py-1 rounded-md hover:bg-blue-800 hover:bg-opacity-30">
                        <span>Tools</span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4 ml-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Table Grid */}
            <TableGrid tableId={currentTableId} />
        </div>
    );
}