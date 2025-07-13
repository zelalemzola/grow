'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  EyeOff,
  Download,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Info
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import React from 'react';

interface Column {
  key: string;
  label: string;
  visible: boolean;
  tooltip?: string;
  sortable?: boolean;
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  onColumnToggle: (columnKey: string) => void;
  searchable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
  expandable?: boolean;
  expandedRows?: string[];
  onRowToggle?: (rowId: string) => void;
}

export function DataTable({ 
  data, 
  columns, 
  onColumnToggle, 
  searchable = true, 
  filterable = true, 
  exportable = true,
  expandable = false,
  expandedRows = [],
  onRowToggle
}: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const visibleColumns = columns.filter(col => col.visible);

  const filteredData = data.filter(item => {
    if (!searchTerm) return true;
    return Object.values(item).some(value => 
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];
    
    if (aValue === bValue) return 0;
    
    const comparison = aValue < bValue ? -1 : 1;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = sortedData.slice(startIndex, endIndex);

  const formatCellValue = (value: any, key: string) => {
    if (key.includes('revenue') || key.includes('profit') || key.includes('amount') || key.includes('spend')) {
      return formatCurrency(value);
    }
    if (key.includes('quantity') || key.includes('orders') || key.includes('impressions') || key.includes('clicks')) {
      return formatNumber(value);
    }
    if (key.includes('ctr') || key.includes('roas') || key.includes('cpa')) {
      return typeof value === 'number' ? value.toFixed(2) : value;
    }
    if (key === 'date') {
      return new Date(value).toLocaleDateString();
    }
    return value?.toString() || '-';
  };

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const handleExport = () => {
    const csvContent = [
      visibleColumns.map(col => col.label).join(','),
      ...currentData.map(row => 
        visibleColumns.map(col => formatCellValue(row[col.key], col.key)).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'table_data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderExpandedRow = (row: any) => {
    const allFields = Object.keys(row);
    const hiddenFields = allFields.filter(field => 
      !visibleColumns.some(col => col.key === field)
    );

    if (hiddenFields.length === 0) return null;

    return (
      <tr className="bg-muted/30">
        <td colSpan={visibleColumns.length} className="p-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Additional Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {hiddenFields.map(field => (
                <div key={field} className="flex justify-between">
                  <span className="font-medium capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}:</span>
                  <span>{formatCellValue(row[field], field)}</span>
                </div>
              ))}
            </div>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Table Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {searchable && (
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full text-sm"
                />
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className="text-xs w-full sm:w-auto"
            >
              {showColumnSelector ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
              Columns
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Badge variant="secondary" className="text-xs w-fit">
              {sortedData.length} items
            </Badge>
            {exportable && (
              <Button variant="outline" size="sm" onClick={handleExport} className="text-xs w-full sm:w-auto">
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            )}
          </div>
        </div>

        {/* Column Selector */}
        {showColumnSelector && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Visible Columns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {columns.map((column) => (
                  <Button
                    key={column.key}
                    variant={column.visible ? "default" : "outline"}
                    size="sm"
                    onClick={() => onColumnToggle(column.key)}
                    className="text-xs justify-start"
                  >
                    {column.visible ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                    {column.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {expandable && <th className="w-8 p-2"></th>}
                  {visibleColumns.map((column) => (
                    <th key={column.key} className="text-left p-2 sm:p-3 font-medium text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => column.sortable && handleSort(column.key)}
                          className={`h-auto p-0 font-medium ${column.sortable ? 'hover:bg-muted' : ''}`}
                          disabled={!column.sortable}
                        >
                          {column.label}
                        </Button>
                        {column.tooltip && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{column.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {column.sortable && sortColumn === column.key && (
                          <span className="text-xs">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentData.map((row, index) => {
                  const rowId = row.id || row.orderId || `row-${index}`;
                  const isExpanded = expandedRows.includes(rowId);
                  
                  return (
                    <React.Fragment key={rowId}>
                      <tr className="border-b hover:bg-muted/50">
                        {expandable && (
                          <td className="p-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRowToggle?.(rowId)}
                              className="h-6 w-6 p-0"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRightIcon className="h-3 w-3" />
                              )}
                            </Button>
                          </td>
                        )}
                        {visibleColumns.map((column) => (
                          <td key={column.key} className="p-2 sm:p-3 whitespace-nowrap">
                            {formatCellValue(row[column.key], column.key)}
                          </td>
                        ))}
                      </tr>
                      {expandable && isExpanded && renderExpandedRow(row)}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              Showing {startIndex + 1} to {Math.min(endIndex, sortedData.length)} of {sortedData.length} results
            </div>
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="text-xs"
              >
                <ChevronLeft className="h-3 w-3" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <div className="text-xs sm:text-sm px-2">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="text-xs"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
} 