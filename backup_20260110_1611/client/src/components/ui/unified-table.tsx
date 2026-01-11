import React from 'react'
import { Table as MantineTable, TableProps as MantineTableProps } from '@mantine/core'

export interface UnifiedTableProps extends MantineTableProps {
  striped?: boolean
  hoverable?: boolean
  bordered?: boolean
  compact?: boolean
}

export const UnifiedTable: React.FC<UnifiedTableProps> = ({
  striped = false,
  hoverable = true,
  bordered = false,
  compact = false,
  children,
  ...props
}) => {
  return (
    <div style={{
      overflowX: 'auto',
      borderRadius: '8px',
      border: bordered ? '1px solid #E5E6EB' : 'none',
    }}>
      <MantineTable
        {...props}
        styles={{
          table: {
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: '0',
            fontSize: '14px',
          },
          thead: {
            backgroundColor: '#F5F7FA',
          },
          th: {
            fontWeight: 600,
            color: '#1D2129',
            fontSize: '14px',
            padding: compact ? '12px 16px' : '16px',
            borderBottom: '1px solid #E5E6EB',
            textAlign: 'left',
            whiteSpace: 'nowrap',
          },
          tr: {
            transition: 'background-color 150ms ease-in-out',
            '&:hover': hoverable ? {
              backgroundColor: '#F5F7FA',
            } : {},
          },
          td: {
            padding: compact ? '12px 16px' : '16px',
            borderBottom: '1px solid #E5E6EB',
            color: '#1D2129',
            fontSize: '14px',
          },
        }}
      >
        {children}
      </MantineTable>
    </div>
  )
}

export const TableHead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, ...props }) => (
  <MantineTable.Thead {...props}>{children}</MantineTable.Thead>
)

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, ...props }) => (
  <MantineTable.Tbody {...props}>{children}</MantineTable.Tbody>
)

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ children, ...props }) => (
  <MantineTable.Tr {...props}>{children}</MantineTable.Tr>
)

export const TableHeaderCell: React.FC<React.HTMLAttributes<HTMLTableCellElement>> = ({ children, ...props }) => (
  <MantineTable.Th {...props}>{children}</MantineTable.Th>
)

export const TableCell: React.FC<React.HTMLAttributes<HTMLTableCellElement>> = ({ children, ...props }) => (
  <MantineTable.Td {...props}>{children}</MantineTable.Td>
)

export default UnifiedTable
