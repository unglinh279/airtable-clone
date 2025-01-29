/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-inferrable-types */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/consistent-indexed-object-style */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { CircleHelp, MoreVertical, X, Plus } from 'lucide-react';
import { api } from "~/utils/api";

const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

// Update the filter type to support groups
type FilterCondition = {
    column: string;
    condition: string;
    value: string;
    condition_type: string | null;
};

type FilterGroup = {
    type: 'group';
    filters: (FilterCondition | FilterGroup)[];
    condition_type: string | null;
};

type FilterItem = FilterCondition | FilterGroup;

type SavedView = {
    id: string;
    name: string;
    sorting: { column: string; order: "asc" | "desc" }[];
    filtering: FilterItem[];
    hiddenColumns: string[];
};

const TableGrid = ({ tableId }) => {
    const { data, status, isFetching, refetch } = api.table.getTableData.useQuery({ tableId });
    const saveTableData = api.table.saveTableData.useMutation();

    const defaultColumns = [
        { id: `${tableId}-name`, title: "Name", type: "text" },
        { id: `${tableId}-notes`, title: "Notes", type: "text" },
        { id: `${tableId}-assignee`, title: "Assignee", type: "text" },
        { id: `${tableId}-status`, title: "Status", type: "text" },
    ];

    const defaultRows = Array.from({ length: 10 }, (_, i) => ({
        id: `${tableId}-row-${i + 1}`,
        cells: Object.fromEntries(defaultColumns.map((col) => [col.id, ""])),
    }));

    type Row = {
        id: string;
        cells: { [key: string]: string };
    };
    type Col = {
        id: string;
        cells: { [key: string]: string };
    };

    const [rows, setRows] = useState<Row[]>(defaultRows);

    const [columns, setColumns] = useState(defaultColumns);
    const [isSaving, setIsSaving] = useState(false);
    const [invalidInput, setInvalidInput] = useState<{ rowId: string; colId: string } | null>(null);

    const [openDropdown, setOpenDropdown] = useState(null);
    const [editingColumn, setEditingColumn] = useState(null);
    const [tempColumnData, setTempColumnData] = useState({ title: "", type: "" });
    const [addingColumn, setAddingColumn] = useState(false);

    const dropdownRef = useRef<HTMLDivElement | null>(null);

    const rowHeight = 32;
    const visibleRowCount = 30;
    const bufferRows = 15;
    const [scrollOffset, setScrollOffset] = useState(0);


    const handleScroll = (event) => {
        const scrollTop = event.target.scrollTop;
        setScrollOffset(scrollTop);
    };

    const startIndex = Math.max(0, Math.floor(scrollOffset / rowHeight) - bufferRows);
    const endIndex = Math.min(rows.length, startIndex + visibleRowCount + bufferRows * 2);

    const paddingTop = startIndex * rowHeight;
    const paddingBottom = (rows.length - endIndex) * rowHeight;

    const debouncedSave = useCallback(
        debounce(async (newColumns, newRows) => {
            setIsSaving(true);
            await saveTableData.mutateAsync({
                tableId,
                columns: newColumns,
                rows: newRows,
            });
            setIsSaving(false);
        }, 500),
        [saveTableData, tableId]
    );

    useEffect(() => {
        if (status === "success" && data) {
            if (data.columns.length === 0 || data.rows.length === 0) {
                debouncedSave(defaultColumns, defaultRows);
            } else {
                setColumns(
                    data.columns.map((col) => ({
                        id: col.id,
                        title: col.name,
                        type: col.type,
                    }))
                );
                setRows(
                    data.rows.map((row) => ({
                        id: row.id,
                        cells: Object.fromEntries(
                            row.data && typeof row.data === "object" && !Array.isArray(row.data)
                                ? Object.entries(row.data).map(([key, value]) => [
                                    key,
                                    value !== null && value !== undefined ? String(value) : "",
                                ])
                                : []
                        ),
                    }))
                );
            }
        }
    }, [status, data]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            const isOutsideAllDropdowns =
                (!hideDropdownRef.current?.contains(event.target)) &&
                (!dropdownRef.current?.contains(event.target)) &&
                (!sortDropdownRef.current?.contains(event.target)) &&
                (!showViewsDropdownRef.current?.contains(event.target)) &&
                (!filterDropdownRef.current?.contains(event.target));

            if (isOutsideAllDropdowns) {
                if (!dropDownEditButtonRef.current?.contains(event.target)) {
                    handleOpenDropdown(null);
                    setAddingColumn(false);
                }

                if (!showViewButton.current?.contains(event.target)) {
                    setShowViewsDropdown(false);
                }

                if (!hideButtonRef.current?.contains(event.target)) {
                    setShowHideDropdown(false);
                }

                if (!filterButtonRef.current?.contains(event.target)) {
                    setShowFilterDropdown(false);
                }

                if (!sortButtonRef.current?.contains(event.target)) {
                    setShowSortDropdown(false);
                }

                handleUnfocusEdit();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [editingColumn, tempColumnData]);

    // Show/Hide columns
    const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
    const [showHideDropdown, setShowHideDropdown] = useState(false);
    const hideButtonRef = useRef<HTMLButtonElement | null>(null);
    const hideDropdownRef = useRef<HTMLDivElement | null>(null);;

    const toggleColumnVisibility = (colId) => {
        setHiddenColumns((prev) =>
            prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
        );
    };

    const showAllColumns = () => setHiddenColumns([]);

    const hideAllColumns = () => {
        const allColumnIds = columns.slice(1).map((col) => col.id);
        setHiddenColumns(allColumnIds);
    };

    // handle views
    const { data: viewsData, refetch: refetchViews } = api.table.loadViews.useQuery({ tableId });
    const saveViewMutation = api.table.saveView.useMutation();
    const deleteViewMutation = api.table.deleteView.useMutation();

    const [views, setViews] = useState<SavedView[]>([]);
    const [currentView, setCurrentView] = useState<string | null>(null);

    const [showViewsDropdown, setShowViewsDropdown] = useState(false);
    const showViewsDropdownRef = useRef<HTMLDivElement | null>(null);
    const showViewButton = useRef<HTMLButtonElement | null>(null);

    const handleToggleViewsDropdown = () => {
        setShowViewsDropdown((prev) => !prev);
    };

    const handleCreateNewView = async () => {
        const viewName = prompt("Enter a name for the new view:");
        if (!viewName) return;

        // Create a deep copy of filters to ensure all nested structures are preserved
        const filtersCopy = JSON.parse(JSON.stringify(filters));

        const newView = {
            name: viewName,
            sorting: [...sorts],
            filtering: filtersCopy,  // Use the deep copy
            hiddenColumns: [...hiddenColumns],
        };

        await saveViewMutation.mutateAsync({
            tableId,
            ...newView,
        });

        refetchViews();
    };

    const handleApplyView = (view: SavedView) => {
        setSorts(view.sorting);
        // Create a deep copy of the filters to avoid reference issues
        setFilters(JSON.parse(JSON.stringify(view.filtering)));
        setHiddenColumns(view.hiddenColumns);
        setCurrentView(view.name);
    };

    const handleDeleteView = async (viewId) => {
        await deleteViewMutation.mutateAsync({ viewId });
        refetchViews();
    };

    // handle search
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<{ rowId: string; colId: string; rowIndex: number }[]>([]);
    const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
    const [showSearch, setShowSearch] = useState(false);
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const tableRef = useRef<HTMLDivElement | null>(null);

    const handleSearch = (query) => {
        setEditingCell(null);
        setSelectedCell(null);

        setSearchTerm(query);
        if (!query.trim()) {
            setSearchResults([]);
            setCurrentMatchIndex(-1);
            return;
        }

        let matches: { rowId: string; colId: string; rowIndex: number }[] = [];
        filteredRows.forEach((row, rowIndex) => {
            Object.keys(row.cells).forEach((colId) => {
                if (!hiddenColumns.includes(colId) && (row.cells[colId] ?? "").toLowerCase().includes(query.toLowerCase())) {
                    matches.push({ rowId: row.id, colId, rowIndex });
                }
            });
        });

        setSearchResults(matches);
        setCurrentMatchIndex(matches.length > 0 ? 0 : -1);

        if (matches.length > 0) {
            scrollToMatch(0);
        }
    };

    const scrollToMatch = (matchIndex) => {
        if (matchIndex < 0 || matchIndex >= searchResults.length) return;

        const match = searchResults[matchIndex];
        if (!match) return;
        const matchRowIndex = rows.findIndex((row) => row.id === match.rowId);


        const container = tableRef.current;
        if (!container) return;

        const targetScroll = matchRowIndex * rowHeight;
        container.scrollTo({
            top: targetScroll - rowHeight * 2,
            behavior: "smooth",
        });

        setCurrentMatchIndex(matchIndex);
    };

    const handleNextMatch = () => {
        if (searchResults.length === 0) return;
        const nextIndex = (currentMatchIndex + 1) % searchResults.length;
        scrollToMatch(nextIndex);
    };

    const handlePrevMatch = () => {
        if (searchResults.length === 0) return;
        const prevIndex =
            (currentMatchIndex - 1 + searchResults.length) % searchResults.length;
        scrollToMatch(prevIndex);
    };

    const handleToggleSearch = () => {
        setShowSearch((prev) => {
            if (prev) {
                setSearchResults([]);
                setCurrentMatchIndex(-1);
                setSearchTerm("");
            }
            else {
                setTimeout(() => {
                    searchInputRef.current?.focus();
                }, 0);
            }
            return !prev;
        });
    };

    // useEffect(() => {
    //     const handleKeyDown = (event) => {
    //         if (event.key === "Enter") {
    //             event.preventDefault();
    //             handleSearch(searchTerm);
    //             handleNextMatch();
    //         }
    //     };

    //     window.addEventListener("keydown", handleKeyDown);
    //     return () => window.removeEventListener("keydown", handleKeyDown);
    // }, [currentMatchIndex, searchResults]);

    useEffect(() => {
        if (showSearch && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [showSearch]);

    // handle filters
    const [filters, setFilters] = useState<FilterItem[]>([]);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const filterButtonRef = useRef<HTMLButtonElement | null>(null);
    const filterDropdownRef = useRef<HTMLDivElement | null>(null);

    // Update handleAddFilter to handle nested groups
    const handleAddFilter = (columnId: string, groupIndex?: number, parentGroupIndex?: number) => {
        const updatedFilters = [...filters];

        if (typeof parentGroupIndex === 'number') {
            // Adding to nested group
            const parentGroup = updatedFilters[parentGroupIndex] as FilterGroup;

            if (groupIndex === undefined || !parentGroup.filters[groupIndex]) return;

            const nestedGroup = parentGroup.filters[groupIndex] as FilterGroup;

            nestedGroup.filters.push({
                column: columnId,
                condition: "",
                value: "",
                condition_type: nestedGroup.filters.length === 1 ? "AND" : null
            });
        } else if (typeof groupIndex === 'number') {
            // Adding to main group
            const group = updatedFilters[groupIndex] as FilterGroup;
            group.filters.push({
                column: columnId,
                condition: "",
                value: "",
                condition_type: group.filters.length === 1 ? "AND" : null
            });
        } else {
            // Adding to root level
            setFilters([...filters, {
                column: columnId,
                condition: "",
                value: "",
                condition_type: filters.length === 1 ? "AND" : null
            }]);
            setShowFilterDropdown(true);
            return;
        }

        setFilters(updatedFilters);
        setShowFilterDropdown(true);
    };

    // Update handleFilterChange to handle nested groups
    const handleFilterChange = (index: number, field: string, value: string, filterIndex?: number, parentGroupIndex?: number) => {
        const updatedFilters = [...filters];

        if (typeof parentGroupIndex === 'number') {
            // Changing nested group filter
            const parentGroup = updatedFilters[parentGroupIndex] as FilterGroup;
            const nestedGroup = parentGroup.filters[index] as FilterGroup;

            if (filterIndex === undefined || !nestedGroup.filters[filterIndex]) return; // Ensure filterIndex is valid

            (nestedGroup.filters[filterIndex] as FilterCondition)[field] = value;
        } else if (typeof filterIndex === 'number') {
            // Changing main group filter
            const group = updatedFilters[index] as FilterGroup;
            (group.filters[filterIndex] as FilterCondition)[field] = value;
        } else {
            // Changing root level filter
            (updatedFilters[index] as FilterCondition)[field] = value;
        }

        setFilters(updatedFilters);
    };

    // Update handleRemoveFilter to handle nested groups
    const handleRemoveFilter = (index: number, filterIndex?: number, parentGroupIndex?: number) => {
        const updatedFilters = [...filters];

        if (typeof parentGroupIndex === 'number') {
            // Removing from nested group
            const parentGroup = updatedFilters[parentGroupIndex] as FilterGroup;
            const nestedGroup = parentGroup.filters[index] as FilterGroup;
            nestedGroup.filters = nestedGroup.filters.filter((_, i) => i !== filterIndex);
            if (nestedGroup.filters.length === 0) {
                parentGroup.filters = parentGroup.filters.filter((_, i) => i !== index);
            }
        } else if (typeof filterIndex === 'number') {
            // Removing from main group
            const group = updatedFilters[index] as FilterGroup;
            group.filters = group.filters.filter((_, i) => i !== filterIndex);
            if (group.filters.length === 0) {
                updatedFilters.splice(index, 1);
            }
        } else {
            // Removing from root level
            updatedFilters.splice(index, 1);
        }

        setFilters(updatedFilters);
    };

    // Update applyFilters to handle groups
    const applyFilters = () => {
        if (filters.length === 0) return rows;

        return rows.filter(row => {
            const globalConditionType = filters[1]?.condition_type ?? 'AND';

            // Evaluate a single filter condition
            const evaluateFilter = (filter: FilterCondition, row: any) => {
                const column = columns.find(col => col.id === filter.column);
                if (!column) return true;
                return evaluateFilterCondition(filter, row.cells[column.id] || "");
            };

            // Evaluate a group of filters
            const evaluateGroup = (group: FilterGroup, row: any): boolean => {
                if (!Array.isArray(group.filters) || group.filters.length === 0) return true;

                const firstFilter = group.filters[0];
                if (!firstFilter) return true; // Ensure it exists

                let result = 'type' in firstFilter
                    ? evaluateGroup(firstFilter as FilterGroup, row)
                    : evaluateFilter(firstFilter as FilterCondition, row);

                for (let i = 1; i < group.filters.length; i++) {
                    const filter = group.filters[i];
                    if (!filter) continue;

                    const matches = 'type' in filter
                        ? evaluateGroup(filter as FilterGroup, row)
                        : evaluateFilter(filter as FilterCondition, row);

                    const conditionType = filter.condition_type ?? 'AND';

                    if (conditionType === 'AND') {
                        result = result && matches;
                    } else {
                        result = result || matches;
                    }
                }
                return result;
            };


            if (filters.length === 0) return true;

            const firstItem = filters[0];
            if (!firstItem) return true;

            let result = 'type' in firstItem
                ? evaluateGroup(firstItem as FilterGroup, row)
                : evaluateFilter(firstItem as FilterCondition, row);


            // Evaluate subsequent filters/groups at root level
            for (let i = 1; i < filters.length; i++) {
                const item = filters[i];
                if (!item) continue;

                const matches = 'type' in item
                    ? evaluateGroup(item as FilterGroup, row)
                    : evaluateFilter(item as FilterCondition, row);

                if (globalConditionType === 'AND') {
                    result = result && matches;
                } else {
                    result = result || matches;
                }
            }

            return result;
        });
    };

    // Helper function to evaluate individual filter conditions
    const evaluateFilterCondition = (filter: FilterCondition, value: string) => {
        switch (filter.condition) {
            case "equals":
                return value === filter.value;
            case "contains":
                return value.toLowerCase().includes(filter.value.toLowerCase());
            case "not contains":
                return !value.toLowerCase().includes(filter.value.toLowerCase());
            case "is empty":
                return value === "";
            case "is not empty":
                return value !== "";
            case "greater than":
                return Number(value) > Number(filter.value);
            case "less than":
                return Number(value) < Number(filter.value);
            default:
                return true;
        }
    };

    const filteredRows = applyFilters();

    // handle sorting
    const [sorts, setSorts] = useState<{ column: string; order: "asc" | "desc" }[]>([]);
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const sortDropdownRef = useRef<HTMLDivElement | null>(null);
    const sortButtonRef = useRef<HTMLButtonElement | null>(null);

    const handleAddSort = () => {
        setSorts([...sorts, { column: "", order: "asc" }]);
    };

    const handleSortChange = (index, field, value) => {
        const updatedSorts = [...sorts];
        if (updatedSorts[index]) {
            updatedSorts[index][field] = value;
        }
        setSorts(updatedSorts);
    };

    const handleRemoveSort = (index) => {
        const updatedSorts = sorts.filter((_, i) => i !== index);
        setSorts(updatedSorts);
    };

    const applySorts = (filteredRows) => {
        if (sorts.length === 0) return filteredRows;

        let sortedRows = [...filteredRows];
        sorts.forEach(sort => {
            const column = columns.find(col => col.id === sort.column);
            if (!column) return;

            sortedRows.sort((a, b) => {
                const valueA = a.cells[column.id] || "";
                const valueB = b.cells[column.id] || "";

                if (column.type === "number") {
                    return sort.order === "asc" ? valueA - valueB : valueB - valueA;
                } else {
                    return sort.order === "asc" ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
                }
            });
        });

        return sortedRows;
    };

    const sortedFilteredRows = applySorts(filteredRows);

    // handle table editing
    const [selectedCell, setSelectedCell] = useState<{ rowId: string; colId: string } | null>(null);
    const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);

    const handleCellClick = (rowId, colId) => {
        setInvalidInput(null);
        if (selectedCell?.rowId === rowId && selectedCell?.colId === colId) {
            setEditingCell({ rowId, colId });
        } else {
            setSelectedCell({ rowId, colId });
            setEditingCell(null);
        }
    };

    const handleCellChange = (e, rowId, colId) => {
        const column = columns.find((col) => col.id === colId);
        if (!column) return;

        if (column.type === "number") {
            if (isNaN(e.target.value)) {
                setInvalidInput({ rowId, colId });
                return;
            } else {
                setInvalidInput(null);
            }
        }

        const updatedRows = [...rows];
        const rowIndex = updatedRows.findIndex((row) => row.id === rowId);
        if (rowIndex === -1) {
            console.error(`Row with id ${rowId} not found.`);
            return; // Exit the function if rowId is invalid
        }

        const updatedRow = updatedRows[rowIndex];
        if (!updatedRow?.cells) {
            console.error(`Cells object is missing for row ${rowId}.`);
            return;
        }

        updatedRow.cells[colId] = e.target.value;
        setRows(updatedRows);
        debouncedSave(columns, updatedRows);
    };

    const renderInvalidInputNote = (rowId, colId) => {
        if (invalidInput?.rowId === rowId && invalidInput?.colId === colId) {
            return (
                <div className="absolute bottom-0 left-0 text-xs text-red-500">
                    Please enter a valid number
                </div>
            );
        }
        return null;
    };

    const handleAddRow = () => {
        const newRow = {
            id: `${tableId}-row-${rows.length + 1}`,
            cells: Object.fromEntries(columns.map((col) => [col.id, ""])),
        };
        const updatedRows = [...rows, newRow];
        setRows(updatedRows);
        debouncedSave(columns, updatedRows);
    };

    const handleAdd15kRows = async () => {
        const chunkSize = 1000;
        for (let i = 0; i < 15; i++) {
            const newRows = Array.from({ length: chunkSize }, (_, index) => ({
                id: `${tableId}-row-${rows.length + index + i * chunkSize + 1}`,
                cells: Object.fromEntries(columns.map((col) => [col.id, ""])),
            }));
            setRows((prevRows) => [...prevRows, ...newRows]);
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
        debouncedSave(columns, rows);
    };


    const handleAddColumn = () => {
        setAddingColumn(true);
        setTempColumnData({ title: "", type: "text" });
    };

    const handleConfirmAddColumn = () => {
        if (!tempColumnData.title.trim()) {
            alert("Column name cannot be empty!");
            return;
        }

        const newColId = `${tableId}-col-${columns.length + 1}`;
        const newColumn = { id: newColId, title: tempColumnData.title.trim(), type: tempColumnData.type };

        const updatedColumns = [...columns, newColumn];
        const updatedRows = rows.map((row) => ({
            ...row,
            cells: { ...row.cells, [newColId]: "" },
        }));

        setColumns(updatedColumns);
        setRows(updatedRows);
        debouncedSave(updatedColumns, updatedRows);

        setAddingColumn(false);
    };

    const handleKeyDown = (e) => {
        if (selectedCell) {
            const { rowId, colId } = selectedCell;
            const currentRowIndex = rows.findIndex((row) => row.id === rowId);
            const currentColIndex = columns.findIndex((col) => col.id === colId);

            if ((e.key === "Delete" || e.key === "Backspace") && selectedCell && !editingCell) {
                const newRows = [...rows];
                const rowIndex = newRows.findIndex((row) => row.id === rowId);

                if (rowIndex === -1) {
                    console.error(`Row with id ${rowId} not found.`);
                    return; // Exit if row doesn't exist
                }

                const updatedRow = newRows[rowIndex];
                if (!updatedRow?.cells) {
                    console.error(`Cells object is missing for row ${rowId}.`);
                    return;
                }

                updatedRow.cells[colId] = "";
                setRows(newRows);
                debouncedSave(columns, newRows);
            }

            if (e.key === "Tab") {
                e.preventDefault();
                setEditingCell(null); // Exit edit mode
                const nextColIndex = (currentColIndex + 1) % columns.length;
                const nextRowIndex =
                    currentColIndex + 1 >= columns.length
                        ? (currentRowIndex + 1) % rows.length
                        : currentRowIndex;

                if (nextRowIndex < 0 || nextRowIndex >= rows.length) {
                    console.error(`Invalid row index: ${nextRowIndex}`);
                    return; // Exit if index is out of range
                }

                if (!rows[nextRowIndex]) {
                    console.error(`Row at index ${nextRowIndex} is undefined.`);
                    return;
                }

                setSelectedCell({
                    rowId: rows[nextRowIndex].id ?? "",
                    colId: columns[nextColIndex]?.id ?? "",
                });
            }

            if (e.key === "Enter") {
                if (editingCell) {
                    e.preventDefault();
                    setEditingCell(null);
                    const newRows = [...rows];
                    const rowIndex = newRows.findIndex((row) => row.id === rowId);
                    // Save the updated rows to the database
                    debouncedSave(columns, newRows);
                    const nextRowIndex = (currentRowIndex + 1) % rows.length;
                    if (nextRowIndex < 0 || nextRowIndex >= rows.length) {
                        console.error(`Invalid row index: ${nextRowIndex}`);
                        return; // Prevent out-of-bounds access
                    }

                    if (!rows[nextRowIndex]) {
                        console.error(`Row at index ${nextRowIndex} is undefined.`);
                        return;
                    }

                    setSelectedCell({
                        rowId: rows[nextRowIndex].id,
                        colId: colId,
                    });
                } else {
                    setEditingCell(selectedCell);
                }
            }
        }
    };

    // Handle dropdown edit
    const dropDownEditButtonRef = useRef<HTMLButtonElement | null>(null);

    const handleOpenDropdown = (columnId) => {
        setOpenDropdown(openDropdown === columnId ? null : columnId);
        setEditingColumn(null);
    };

    const handleEditField = (column) => {
        setEditingColumn(column.id);
        setTempColumnData({ title: column.title, type: column.type });
    };

    const handleSaveColumn = () => {
        const column = columns.find((col) => col.id === editingColumn);

        if (!column) return;

        if (
            column.type !== tempColumnData.type &&
            tempColumnData.type === "number"
        ) {
            const confirmDelete = window.confirm(
                `Changing this field to "Number" will delete all non-numeric values in the column "${tempColumnData.title}". Do you want to continue?`
            );

            if (!confirmDelete) {
                setEditingColumn(null);
                return;
            }

            const updatedRows = [...rows];
            updatedRows.forEach((row) => {
                const rowIndex = updatedRows.findIndex((r) => r.id === row.id);
                if (rowIndex !== -1 && updatedRows[rowIndex]) {
                    const colId = column?.id;
                    if (!colId) return;

                    const value = row.cells?.[colId] ?? "";

                    if (isNaN(Number(value)) || value.trim() === "") {
                        updatedRows[rowIndex].cells = { ...updatedRows[rowIndex].cells, [colId]: "" };
                    }
                }
            });


            setRows(updatedRows);
            debouncedSave(columns, updatedRows);
        }

        // Update column type and name
        const updatedColumns = columns.map((col) =>
            col.id === editingColumn
                ? { ...col, title: tempColumnData.title, type: tempColumnData.type }
                : col
        );

        setColumns(updatedColumns);
        debouncedSave(updatedColumns, rows);
        setEditingColumn(null);
    };

    const handleCancelEdit = () => {
        setEditingColumn(null);
    };

    const handleUnfocusEdit = () => {
        const column = columns.find((col) => col.id === editingColumn);
        if (
            column &&
            (tempColumnData.title !== column.title || tempColumnData.type !== column.type)
        ) {
            if (window.confirm(`Do you want to save the changes made to ${column.title}?`)) {
                handleSaveColumn();
            } else {
                handleCancelEdit();
            }
        }
    };

    const renderEditField = ({ mode = "edit" }) => (
        <div
            className="absolute bg-white border rounded shadow-lg p-4 z-20 w-60"
            ref={dropdownRef}
            style={{ fontWeight: "normal" }}
        >
            <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Column Name</label>
                <input
                    type="text"
                    value={tempColumnData.title}
                    className="border rounded w-full px-2 py-1"
                    onChange={(e) =>
                        setTempColumnData({ ...tempColumnData, title: e.target.value })
                    }
                />
            </div>
            <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                    value={tempColumnData.type}
                    className="border rounded w-full px-2 py-1"
                    onChange={(e) =>
                        setTempColumnData({ ...tempColumnData, type: e.target.value })
                    }
                >
                    <option value="text">String</option>
                    <option value="number">Number</option>
                </select>
            </div>
            <div className="flex justify-end space-x-2">
                <button
                    onClick={() => (mode === "edit" ? handleCancelEdit() : setAddingColumn(false))}
                    className="bg-gray-200 px-4 py-1 rounded hover:bg-gray-300"
                >
                    Cancel
                </button>
                <button
                    onClick={() => (mode === "edit" ? handleSaveColumn() : handleConfirmAddColumn())}
                    className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600"
                >
                    Save
                </button>
            </div>
        </div>
    );

    const handleDeleteColumn = (columnId) => {
        const updatedColumns = columns.filter((col) => col.id !== columnId);
        const updatedRows = rows.map((row) => {
            const updatedCells = { ...row.cells };
            delete updatedCells[columnId];
            return { ...row, cells: updatedCells };
        });

        setColumns(updatedColumns);
        setRows(updatedRows);
        debouncedSave(updatedColumns, updatedRows);
    };

    const renderDropdownContent = (column) => (
        <div
            className="absolute bg-white border rounded shadow-lg p-2 z-20 w-60"
            ref={dropdownRef}
        >
            <button
                onClick={() => handleEditField(column)}
                className="w-full text-left px-2 py-1 hover:bg-gray-100"
            >
                Edit field
            </button>
            {column.type === "number" ? (
                <>
                    <button className="w-full text-left px-2 py-1 hover:bg-gray-100">
                        Sort 1 → 9
                    </button>
                    <button className="w-full text-left px-2 py-1 hover:bg-gray-100">
                        Sort 9 → 1
                    </button>
                </>
            ) : (
                <>
                    <button className="w-full text-left px-2 py-1 hover:bg-gray-100">
                        Sort A → Z
                    </button>
                    <button className="w-full text-left px-2 py-1 hover:bg-gray-100">
                        Sort Z → A
                    </button>
                </>
            )}
            <button
                className="w-full text-left px-2 py-1 hover:bg-gray-100"
                onClick={() => handleAddFilter(column.id)}
            >
                Filter by this field
            </button>
            <button
                onClick={() => handleDeleteColumn(column.id)}
                className="w-full text-left px-2 py-1 hover:bg-gray-100 text-red-500"
            >
                Delete column
            </button>
        </div>
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [selectedCell, editingCell]);

    useEffect(() => {
        if (viewsData) {
            // Ensure the filtering data is properly parsed when loading views
            const parsedViews = viewsData.map(view => ({
                ...view,
                filtering: Array.isArray(view.filtering)
                    ? view.filtering
                    : typeof view.filtering === 'string'
                        ? JSON.parse(view.filtering)
                        : []
            }));
            (parsedViews);
        }
    }, [viewsData]);

    // Add function to handle adding nested filter groups
    const handleAddNestedFilterGroup = (parentGroupIndex: number) => {
        const updatedFilters = [...filters];
        const parentGroup = updatedFilters[parentGroupIndex] as FilterGroup;
        parentGroup.filters.push({
            type: 'group',
            filters: [],
            condition_type: parentGroup.filters.length === 1 ? "AND" : null
        });
        setFilters(updatedFilters);
    };

    // Update the filter group rendering to include nested groups
    const renderFilterGroup = (group: FilterGroup, index: number, level: number = 0, parentGroupIndex?: number) => {
        if (level > 1) return null; // Limit nesting to 2 levels

        return (
            <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Filter Group</span>
                    <button
                        onClick={() => parentGroupIndex !== undefined
                            ? handleRemoveFilter(index, undefined, parentGroupIndex)
                            : handleRemoveFilter(index)
                        }
                        className="text-red-500 hover:text-red-700"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="ml-6 border-l-2 border-gray-200 pl-4">
                    {group.filters.map((filter, filterIndex) => (
                        <div key={filterIndex} className="flex items-center space-x-3 mb-3">
                            {/* Where/AND/OR label */}
                            {filterIndex === 0 ? (
                                <span className="text-sm text-gray-600 w-20">Where</span>
                            ) : filterIndex === 1 ? (
                                <select
                                    className="border p-2 rounded-md text-gray-700 text-sm w-20"
                                    value={filter.condition_type ?? 'AND'}
                                    onChange={(e) => {
                                        const updatedFilters = [...filters];
                                        const currentGroup = updatedFilters[index] as FilterGroup;
                                        currentGroup.filters = currentGroup.filters.map((f, i) =>
                                            i >= 1 ? { ...f, condition_type: e.target.value } : f
                                        );
                                        setFilters(updatedFilters);
                                    }}
                                >
                                    <option value="AND">AND</option>
                                    <option value="OR">OR</option>
                                </select>
                            ) : (
                                <span className="text-sm text-gray-600 w-20">
                                    {(group.filters[1] as FilterCondition)?.condition_type ?? 'AND'}
                                </span>
                            )}

                            {'type' in filter ? (
                                // Render nested group
                                renderFilterGroup(filter as FilterGroup, filterIndex, level + 1, index)
                            ) : (
                                // Render filter controls with updated handler calls
                                <div className="flex items-center space-x-3 flex-1">
                                    <select
                                        value={(filter as FilterCondition).column}
                                        onChange={(e) => parentGroupIndex !== undefined
                                            ? handleFilterChange(index, "column", e.target.value, filterIndex, parentGroupIndex)
                                            : handleFilterChange(index, "column", e.target.value, filterIndex)
                                        }
                                        className="border p-2 rounded-md flex-1 text-gray-700 text-sm"
                                    >
                                        <option value="">Select Column</option>
                                        {columns.map(col => (
                                            <option key={col.id} value={col.id}>{col.title}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={(filter as FilterCondition).condition}
                                        onChange={(e) => parentGroupIndex !== undefined
                                            ? handleFilterChange(index, "condition", e.target.value, filterIndex, parentGroupIndex)
                                            : handleFilterChange(index, "condition", e.target.value, filterIndex)
                                        }
                                        className="border p-2 rounded-md text-gray-700 text-sm"
                                    >
                                        <option value="">Select Condition</option>
                                        {columns.find(col => col.id === (filter as FilterCondition).column)?.type === "number" ? (
                                            <>
                                                <option value="equals">Equals</option>
                                                <option value="greater than">Greater Than</option>
                                                <option value="less than">Less Than</option>
                                                <option value="is empty">Is Empty</option>
                                                <option value="is not empty">Is Not Empty</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="equals">Equals</option>
                                                <option value="contains">Contains</option>
                                                <option value="not contains">Not Contains</option>
                                                <option value="is empty">Is Empty</option>
                                                <option value="is not empty">Is Not Empty</option>
                                            </>
                                        )}
                                    </select>
                                    <input
                                        type="text"
                                        value={(filter as FilterCondition).value}
                                        onChange={(e) => parentGroupIndex !== undefined
                                            ? handleFilterChange(index, "value", e.target.value, filterIndex, parentGroupIndex)
                                            : handleFilterChange(index, "value", e.target.value, filterIndex)
                                        }
                                        disabled={(filter as FilterCondition).condition === "is empty" || (filter as FilterCondition).condition === "is not empty"}
                                        className="border p-2 rounded-md text-gray-700 text-sm"
                                    />
                                    <button onClick={() => parentGroupIndex !== undefined
                                        ? handleRemoveFilter(index, filterIndex, parentGroupIndex)
                                        : handleRemoveFilter(index, filterIndex)
                                    }>
                                        <X size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}

                    <div className="flex space-x-4">
                        <button
                            onClick={() => parentGroupIndex !== undefined
                                ? handleAddFilter("", index, parentGroupIndex)
                                : handleAddFilter("", index)
                            }
                            className="text-blue-600 hover:text-blue-800 transition flex items-center space-x-1 text-sm"
                        >
                            <Plus size={16} />
                            <span>Add Condition to Group</span>
                        </button>
                        {level < 1 && (
                            <button
                                onClick={() => handleAddNestedFilterGroup(index)}
                                className="text-blue-600 hover:text-blue-800 transition flex items-center space-x-1 text-sm"
                            >
                                <Plus size={16} />
                                <span>Add Condition Group</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Add this with the other filter-related functions
    const handleAddFilterGroup = () => {
        setFilters([...filters, {
            type: 'group',
            filters: [],
            condition_type: filters.length === 1 ? "AND" : null
        }]);
        setShowFilterDropdown(true);
    };

    if (status === "pending" || isFetching) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="loader"></div>
            </div>
        );
    }

    return (
        <div
            style={{
                overflow: "auto",
            }}>
            <div className="flex flex-col h-full bg-gray-100">
                {/* Top Table Bar */}
                <div className="bg-white border-b px-2 py-1 flex justify-between items-center shadow-sm">
                    {/* Toolbar Left */}
                    <div className="flex items-center space-x-2">
                        {/* Views */}
                        <div className="relative">
                            <button
                                ref={showViewButton}
                                onClick={handleToggleViewsDropdown}
                                className="flex items-center px-2 py-1 rounded-md hover:bg-gray-200 transition"
                            >
                                <img
                                    src="https://img.icons8.com/?size=100&id=3096&format=png&color=000000"
                                    alt="Views"
                                    className="w-3 h-3 group-hover:hidden"
                                />
                                <span className="ml-1 text-sm font-medium">Views</span>
                            </button>

                            {showViewsDropdown && (
                                <div
                                    ref={showViewsDropdownRef}
                                    className="absolute bg-white border rounded shadow-lg p-3 z-20 w-64">
                                    <div>
                                        <h3 className="text-sm font-bold">Manage Views</h3>
                                    </div>
                                    <ul className="my-2">
                                        {views.map((view) => (
                                            <li
                                                key={view.id}
                                                className="flex justify-between items-center px-2 py-1 cursor-pointer hover:bg-gray-100 rounded"
                                                onClick={() => handleApplyView(view)}
                                            >
                                                <span>{view.name}</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteView(view.id);
                                                    }}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    Delete
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="border-t mt-2 pt-2">
                                        <button
                                            onClick={handleCreateNewView}
                                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full"
                                        >
                                            Create New View
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button className="flex items-center px-2 py-1 rounded-md hover:bg-gray-200 transition">
                            <img
                                src="https://img.icons8.com/?size=100&id=39106&format=png&color=000000"
                                alt="Grid View"
                                className="w-3 h-3 group-hover:hidden"
                            />
                            <span className="ml-1 text-sm">Grid View</span>
                        </button>

                        {/* Hide Field */}
                        <div className="relative">
                            <button
                                ref={hideButtonRef}
                                className={`flex items-center px-2 py-1 rounded-md hover:bg-gray-200 transition ${hiddenColumns.length > 0 ? 'bg-green-200' : 'hover:bg-gray-200'}`}
                                onClick={() => setShowHideDropdown(!showHideDropdown)}>
                                <img
                                    src="https://img.icons8.com/?size=100&id=33916&format=png&color=000000"
                                    alt="Hide"
                                    className="w-3 h-3 group-hover:hidden"
                                />
                                <span className="ml-1 text-sm">{hiddenColumns.length > 0 ? `${hiddenColumns.length} Hidden Fields` : "Hide Field"}</span>
                            </button>
                            {showHideDropdown && (
                                <div ref={hideDropdownRef} className="absolute bg-white border rounded-lg shadow-lg w-56 z-20" style={{ top: '100%', left: '0' }}>
                                    {/* Search Header */}
                                    <div className="p-2 border-b">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Find a field"
                                                className="w-full pl-2 pr-7 py-1 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                                            />
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                <CircleHelp className="text-gray-400 w-4 h-4"></CircleHelp>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column List */}
                                    <div className="py-1">
                                        {columns.slice(1).map((col) => (
                                            <div
                                                key={col.id}
                                                className="flex items-center px-2 py-1.5 hover:bg-gray-50 text-sm"
                                                onClick={() => toggleColumnVisibility(col.id)}
                                            >
                                                {/* Toggle Switch */}
                                                <button
                                                    className={`relative inline-flex h-3 w-5 items-center rounded-full mr-2 ${!hiddenColumns.includes(col.id) ? 'bg-green-500' : 'bg-gray-200'
                                                        }`}
                                                    onClick={() => toggleColumnVisibility(col.id)}
                                                >
                                                    <span
                                                        className={`inline-block h-2 w-2 transform rounded-full bg-white transition ${!hiddenColumns.includes(col.id) ? 'translate-x-2.5' : 'translate-x-0.5'
                                                            }`}
                                                    />
                                                </button>

                                                <div className="flex items-center gap-2 flex-1">
                                                    <span className="text-sm">{col.title}</span>
                                                </div>
                                                <MoreVertical className="h-3 w-3 text-gray-400" />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Footer Buttons */}
                                    <div className="grid grid-cols-2 border-t text-xs">
                                        <button
                                            onClick={hideAllColumns}
                                            className="py-2 text-center hover:bg-gray-50 rounded-bl-lg"
                                        >
                                            Hide all
                                        </button>
                                        <button
                                            onClick={showAllColumns}
                                            className="py-2 text-center hover:bg-gray-50 rounded-br-lg border-l"
                                        >
                                            Show all
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Filter */}
                        <div className="relative">
                            <button
                                ref={filterButtonRef}
                                className={`flex items-center px-2 py-1 rounded-md hover:bg-gray-200 transition ${filters.length > 0 ? 'bg-green-200' : 'hover:bg-gray-200'}`}
                                onClick={() => setShowFilterDropdown(!showFilterDropdown)}>
                                <img
                                    src="https://img.icons8.com/?size=100&id=3004&format=png&color=000000"
                                    alt="Filter"
                                    className="w-3 h-3 group-hover:hidden"
                                />
                                <span className="ml-1 text-sm">{filters.length > 0 ? `Filtered by: ${filters.length}` : "Filter"}</span>
                            </button>
                            {showFilterDropdown && (
                                <div ref={filterDropdownRef} className="absolute left-0 top-full mt-2 bg-white border rounded-lg shadow-2xl p-5 z-50 inline-block min-w-max max-w-screen-md whitespace-nowrap">
                                    {filters.map((item, index) => (
                                        <div key={index} className="mb-4">
                                            <div className="flex items-center space-x-3">
                                                {/* Where/AND/OR label */}
                                                {index === 0 ? (
                                                    <span className="text-sm text-gray-600 w-20">Where</span>
                                                ) : index === 1 ? (
                                                    <select
                                                        className="border p-2 rounded-md text-gray-700 text-sm w-20"
                                                        value={item.condition_type ?? 'AND'}
                                                        onChange={(e) => {
                                                            const updatedFilters = filters.map((f, i) =>
                                                                i >= 1 ? { ...f, condition_type: e.target.value } : f
                                                            );
                                                            setFilters(updatedFilters);
                                                        }}
                                                    >
                                                        <option value="AND">AND</option>
                                                        <option value="OR">OR</option>
                                                    </select>
                                                ) : (
                                                    <span className="text-sm text-gray-600 w-20">
                                                        {item.condition_type ?? 'AND'}
                                                    </span>
                                                )}

                                                {'type' in item ? (
                                                    renderFilterGroup(item as FilterGroup, index)
                                                ) : (
                                                    // Render individual filter
                                                    <div className="flex items-center space-x-3 flex-1">
                                                        <select
                                                            value={item.column}
                                                            onChange={(e) => handleFilterChange(index, "column", e.target.value)}
                                                            className="border p-2 rounded-md flex-1 text-gray-700 text-sm"
                                                        >
                                                            <option value="">Select Column</option>
                                                            {columns.map(col => (
                                                                <option key={col.id} value={col.id}>{col.title}</option>
                                                            ))}
                                                        </select>
                                                        <select
                                                            value={item.condition}
                                                            onChange={(e) => handleFilterChange(index, "condition", e.target.value)}
                                                            className="border p-2 rounded-md text-gray-700 text-sm"
                                                        >
                                                            <option value="">Select Condition</option>
                                                            {columns.find(col => col.id === item.column)?.type === "number" ? (
                                                                <>
                                                                    <option value="equals">Equals</option>
                                                                    <option value="greater than">Greater Than</option>
                                                                    <option value="less than">Less Than</option>
                                                                    <option value="is empty">Is Empty</option>
                                                                    <option value="is not empty">Is Not Empty</option>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <option value="equals">Equals</option>
                                                                    <option value="contains">Contains</option>
                                                                    <option value="not contains">Not Contains</option>
                                                                    <option value="is empty">Is Empty</option>
                                                                    <option value="is not empty">Is Not Empty</option>
                                                                </>
                                                            )}
                                                        </select>
                                                        <input
                                                            type="text"
                                                            value={item.value}
                                                            onChange={(e) => handleFilterChange(index, "value", e.target.value)}
                                                            disabled={item.condition === "is empty" || item.condition === "is not empty"}
                                                            className="border p-2 rounded-md text-gray-700 text-sm"
                                                        />
                                                        <button onClick={() => handleRemoveFilter(index)}>
                                                            <X size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    <div className="flex space-x-4">
                                        <button
                                            onClick={() => handleAddFilter("")}
                                            className="text-blue-600 hover:text-blue-800 transition flex items-center space-x-1 text-sm"
                                        >
                                            <Plus size={16} />
                                            <span>Add Condiion</span>
                                        </button>
                                        <button
                                            onClick={handleAddFilterGroup}
                                            className="text-blue-600 hover:text-blue-800 transition flex items-center space-x-1 text-sm"
                                        >
                                            <Plus size={16} />
                                            <span>Add Condition Group</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button className="flex items-center px-2 py-1 hover:bg-gray-200 rounded">
                            <img
                                src="https://img.icons8.com/?size=100&id=41480&format=png&color=000000"
                                alt="Group"
                                className="w-3 h-3 group-hover:hidden"
                            />
                            <span className="ml-1 text-sm">Group</span>
                        </button>

                        {/* Sort */}
                        <div className="relative">
                            <button
                                ref={sortButtonRef}
                                className={`flex items-center px-2 py-1 hover:bg-gray-200 rounded ${sorts.length > 0 ? 'bg-green-200' : 'hover:bg-gray-200'}`}
                                onClick={() => setShowSortDropdown(!showSortDropdown)}>
                                <img
                                    src="https://img.icons8.com/?size=100&id=21907&format=png&color=000000"
                                    alt="Sort"
                                    className="w-3 h-3 group-hover:hidden"
                                />
                                <span className="ml-1 text-sm">{sorts.length > 0 ? `Sorted by ${sorts.length} fields` : "Sort"}</span>
                            </button>
                            {showSortDropdown && (
                                <div
                                    ref={sortDropdownRef}
                                    className="absolute left-0 top-full mt-2 bg-white border rounded-lg shadow-2xl p-5 z-50 inline-block min-w-max max-w-screen-md whitespace-nowrap"
                                >
                                    <p className="text-gray-700 font-semibold mb-3 text-sm">Sort by</p>

                                    {sorts.map((sort, index) => (
                                        <div key={index} className="flex items-center space-x-3 mb-3">
                                            <select
                                                value={sort.column}
                                                onChange={(e) => handleSortChange(index, "column", e.target.value)}
                                                className="border p-2 rounded-md flex-1 text-gray-700 text-sm"
                                            >
                                                <option value="">Select Column</option>
                                                {columns.map(col => (
                                                    <option key={col.id} value={col.id}>{col.title}</option>
                                                ))}
                                            </select>

                                            <select
                                                value={sort.order}
                                                onChange={(e) => handleSortChange(index, "order", e.target.value)}
                                                className="border p-2 rounded-md text-gray-700 text-sm"
                                            >
                                                {columns.find(col => col.id === sort.column)?.type === "number" ? (
                                                    <>
                                                        <option value="asc">1 → 9</option>
                                                        <option value="desc">9 → 1</option>
                                                    </>
                                                ) : (
                                                    <>
                                                        <option value="asc">A → Z</option>
                                                        <option value="desc">Z → A</option>
                                                    </>
                                                )}
                                            </select>

                                            <button onClick={() => handleRemoveSort(index)} className="text-gray-500 hover:text-red-500 transition">
                                                <X size={18} />
                                            </button>
                                        </div>
                                    ))}

                                    <button
                                        onClick={handleAddSort}
                                        className="text-blue-600 hover:text-blue-800 transition flex items-center space-x-1 text-sm"
                                    >
                                        <Plus size={16} />
                                        <span>Add another sort</span>
                                    </button>
                                </div>
                            )}

                        </div>

                        <button className="flex items-center px-2 py-1 hover:bg-gray-200 rounded">
                            <img
                                src="https://img.icons8.com/?size=100&id=78740&format=png&color=000000"
                                alt="Color"
                                className="w-3 h-3 group-hover:hidden"
                            />
                            <span className="ml-1 text-sm">Color</span>
                        </button>
                    </div>

                    {/* Toolbar Right */}
                    <div className="flex items-center space-x-1">
                        {showSearch && (
                            <div className="flex items-center space-x-1 border p-1 rounded shadow">
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="border px-2 py-1 w-40 text-sm"
                                />
                                <span className="text-xs text-gray-500">
                                    {searchResults.length > 0
                                        ? `${currentMatchIndex + 1} / ${searchResults.length}`
                                        : "0 matches"}
                                </span>
                                <button onClick={handlePrevMatch} className="p-1">
                                    <img
                                        src="https://img.icons8.com/?size=100&id=37217&format=png&color=000000"
                                        alt="Up"
                                        className="w-4 h-4 group-hover:hidden"
                                    />
                                </button>
                                <button onClick={handleNextMatch} className="p-1">
                                    <img
                                        src="https://img.icons8.com/?size=100&id=37214&format=png&color=000000"
                                        alt="Down"
                                        className="w-4 h-4 group-hover:hidden"
                                    />
                                </button>
                            </div>
                        )}
                        <button
                            className="hover:bg-gray-100 rounded p-1"
                            onClick={handleToggleSearch}
                        >
                            <img
                                src="https://img.icons8.com/?size=100&id=59878&format=png&color=000000"
                                alt="Color"
                                className="w-3 h-3 group-hover:hidden"
                            />
                        </button>
                    </div>
                </div>

                {/* Table Content */}
                <div
                    ref={tableRef}
                    style={{
                        height: `${rowHeight * visibleRowCount}px`,
                        overflowY: "auto",
                        border: "1px solid #ccc",
                    }}
                    onScroll={handleScroll}
                >
                    <table
                        className="bg-white text-sm"
                        style={{
                            //tableLayout: "fixed",
                            //minWidth: `${columns.length * 180 + 64}px`,
                        }}
                    >
                        <thead className="border border-gray-300 bg-gray-100 sticky top-0 z-10">
                            <tr>
                                <th className="w-16 text-center sticky left-0 bg-gray-100"></th>
                                {columns
                                    .filter((col) => !hiddenColumns.includes(col.id))
                                    .map((column) => (
                                        <th
                                            key={column.id}
                                            className="border border-gray-300 text-left px-2"
                                            style={{
                                                minWidth: "180px",
                                                height: "32px",
                                                fontWeight: "normal",
                                                borderLeft: "none"
                                            }}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span>{column.title}</span>
                                                <button
                                                    ref={dropDownEditButtonRef}
                                                    onClick={() => handleOpenDropdown(column.id)}
                                                    className="text-gray-500 hover:text-black"
                                                >
                                                    <img
                                                        src="https://img.icons8.com/?size=100&id=40021&format=png&color=000000"
                                                        alt="Down"
                                                        className="w-4 h-4 group-hover:hidden"
                                                    />
                                                </button>
                                            </div>
                                            {openDropdown === column.id && editingColumn === column.id
                                                ? renderEditField({ mode: "edit" })
                                                : openDropdown === column.id && renderDropdownContent(column)}

                                        </th>
                                    ))}
                                <th
                                    className="border border-gray-300 text-center"
                                    style={{ minWidth: "180px", height: "32px" }}
                                >
                                    {addingColumn ? (
                                        renderEditField({ mode: "add" })
                                    ) : (
                                        <button
                                            onClick={handleAddColumn}
                                            className="w-full h-full bg-gray-100 hover:bg-gray-50"
                                        >
                                            +
                                        </button>
                                    )}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ height: `${paddingTop}px` }} />
                            {sortedFilteredRows.slice(startIndex, endIndex).map((row, index) => (
                                <tr key={row.id} className="hover:bg-gray-100">
                                    <td
                                        className="w-16 border border-gray-300 text-center sticky left-0 bg-white"
                                        style={{ minWidth: "64px", height: "32px" }}
                                    >
                                        {startIndex + index + 1}
                                    </td>
                                    {columns
                                        .filter((col) => !hiddenColumns.includes(col.id))
                                        .map((column) => {
                                            const isSelected = selectedCell?.rowId === row.id && selectedCell?.colId === column.id;
                                            const isSearchMatch =
                                                searchResults[currentMatchIndex]?.rowId === row.id &&
                                                searchResults[currentMatchIndex]?.colId === column.id;

                                            return (
                                                <td
                                                    key={`${row.id}-${column.id}`}
                                                    className={`border border-gray-300 px-2 cursor-pointer 
                                                    ${isSelected ? "bg-blue-100" : ""}
                                                    ${isSearchMatch ? "bg-yellow-300" : ""}
                                                `}
                                                    style={{ minWidth: "180px", height: "32px" }}
                                                    onClick={() => handleCellClick(row.id, column.id)}
                                                >
                                                    {editingCell?.rowId === row.id && editingCell?.colId === column.id ? (
                                                        <div className="relative flex flex-col h-full">
                                                            <input
                                                                type="text"
                                                                value={row.cells[column.id]}
                                                                onChange={(e) => handleCellChange(e, row.id, column.id)}
                                                                className="w-full h-full bg-transparent focus:outline-none"
                                                                autoFocus
                                                            />
                                                            {renderInvalidInputNote(row.id, column.id)}
                                                        </div>
                                                    ) : (
                                                        row.cells[column.id]
                                                    )}
                                                </td>
                                            );
                                        })}
                                    <td className="bg-gray-100"></td>
                                </tr>
                            ))}
                            <tr
                                onClick={handleAddRow}
                                className="cursor-pointer hover:bg-gray-100"
                            >
                                <td
                                    className="border border-gray-300 text-center"
                                    style={{ height: "32px" }}
                                >
                                    +
                                </td>
                                <td
                                    colSpan={columns.length - (hiddenColumns.length)}
                                    className="border border-gray-300 text-center"
                                    style={{ height: "32px" }}
                                >
                                </td>
                                <td
                                    className="bg-gray-100"
                                    style={{ minWidth: "180px", height: "32px" }}
                                ></td>
                            </tr>
                            <tr
                                onClick={handleAdd15kRows}
                                className="cursor-pointer hover:bg-gray-100"
                            >
                                <td
                                    className="border border-gray-300 text-center"
                                    style={{ height: "32px" }}
                                >
                                    + 15k
                                </td>
                                <td
                                    colSpan={columns.length - (hiddenColumns.length)}
                                    className="border border-gray-300 text-center"
                                    style={{ height: "32px" }}
                                >
                                </td>
                                <td
                                    className="bg-gray-100"
                                    style={{ minWidth: "180px", height: "32px" }}
                                ></td>
                            </tr>
                            <tr style={{ height: `${paddingBottom}px` }} />

                        </tbody>

                        {/* <tbody>
                            {rows.map((row, index) => (
                                <tr key={row.id} className="hover:bg-gray-100">
                                    <td
                                    className="w-16 border border-gray-300 text-center sticky left-0 bg-white"
                                    style={{ minWidth: "64px", height: "32px" }}
                                >
                                    {index + 1}
                                </td>
                                {columns.map((column) => (
                                    <td
                                        key={`${row.id}-${column.id}`}
                                        className={`border border-gray-300 px-2 cursor-pointer ${selectedCell?.rowId === row.id &&
                                            selectedCell?.colId === column.id
                                            ? "bg-blue-100"
                                            : ""
                                            }`}
                                        style={{ minWidth: "180px", height: "32px" }}
                                        onClick={() => handleCellClick(row.id, column.id)}
                                    >
                                        {editingCell?.rowId === row.id &&
                                            editingCell?.colId === column.id ? (
                                            <div className="relative flex flex-col h-full">
                                                <input
                                                    type="text"
                                                    value={row.cells[column.id]}
                                                    onChange={(e) =>
                                                        handleCellChange(e, row.id, column.id)
                                                    }
                                                    className="w-full h-full bg-transparent focus:outline-none"
                                                    autoFocus
                                                />
                                                {renderInvalidInputNote(row.id, column.id)}
                                            </div>
                                        ) : (
                                            row.cells[column.id]
                                        )}
                                    </td>
                                ))}
                                <td
                                    className="bg-gray-100"
                                    style={{ minWidth: "180px", height: "32px" }}
                                ></td>
                            </tr>
                                                            <tr
                                onClick={handleAddRow}
                                className="cursor-pointer hover:bg-gray-100"
                            >
                                <td
                                    className="border border-gray-300 text-center"
                                    style={{ height: "32px" }}
                                >
                                    +
                                </td>
                                <td
                                    colSpan={columns.length}
                                    className="border border-gray-300 text-center"
                                    style={{ height: "32px" }}
                                >
                                </td>
                                <td
                                    className="bg-gray-100"
                                    style={{ minWidth: "180px", height: "32px" }}
                                ></td>
                            </tr>
                            <tr
                                onClick={handleAdd15kRows}
                                className="cursor-pointer hover:bg-gray-100"
                            >
                                <td
                                    className="border border-gray-300 text-center"
                                    style={{ height: "32px" }}
                                >
                                    + 15k
                                </td>
                                <td
                                    colSpan={columns.length}
                                    className="border border-gray-300 text-center"
                                    style={{ height: "32px" }}
                                >
                                </td>
                                <td
                                    className="bg-gray-100"
                                    style={{ minWidth: "180px", height: "32px" }}
                                ></td>
                            </tr>
                        </tbody> */}
                    </table>
                </div>
            </div >
        </div>
    );
};

export default TableGrid;
