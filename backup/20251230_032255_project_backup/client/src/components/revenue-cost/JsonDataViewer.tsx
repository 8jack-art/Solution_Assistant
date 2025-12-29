import React, { useState, useMemo } from 'react'
import {
  Modal,
  Stack,
  Text,
  TextInput,
  ActionIcon,
  Group,
  Tabs,
  LoadingOverlay,
  Alert,
  Button,
  Box,
  ScrollArea,
} from '@mantine/core'
import { IconSearch, IconCopy, IconChevronDown, IconChevronRight, IconX } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'

interface JsonDataViewerProps {
  opened: boolean
  onClose: () => void
  data: any
  loading: boolean
  error: string | null
}

interface JsonNodeProps {
  data: any
  keyName?: string
  searchTerm: string
  level: number
  expanded: Set<string>
  onToggle: (path: string) => void
  path: string
}

/**
 * JSON 节点组件 - 支持折叠和搜索高亮
 */
const JsonNode: React.FC<JsonNodeProps> = ({
  data,
  keyName,
  searchTerm,
  level,
  expanded,
  onToggle,
  path,
}) => {
  const isExpanded = expanded.has(path)
  const isArray = Array.isArray(data)
  const isObject = typeof data === 'object' && data !== null && !isArray
  const isPrimitive = !isObject && !isArray

  // 检查是否匹配搜索词
  const matchesSearch = searchTerm && (
    (keyName && keyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (typeof data === 'string' && data.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (typeof data === 'number' && data.toString().includes(searchTerm))
  )

  // 高亮匹配的文本
  const highlightText = (text: string) => {
    if (!searchTerm) return text
    try {
      // 转义正则表达式特殊字符
      const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(${escapedSearchTerm})`, 'gi')
      const parts = text.split(regex)
      return parts.map((part, index) =>
        part.toLowerCase() === searchTerm.toLowerCase() ? (
          <mark key={index} style={{ backgroundColor: '#ffd700', padding: '0 2px' }}>{part}</mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )
    } catch (error) {
      // 如果正则表达式出错，返回原始文本
      return text
    }
  }

  if (isPrimitive) {
    return (
      <div style={{ marginLeft: `${level * 20}px`, padding: '2px 0' }}>
        {keyName && (
          <span style={{ color: '#9cdcfe', fontWeight: 500 }}>
            {highlightText(keyName)}
            <span style={{ color: '#d4d4d4' }}>: </span>
          </span>
        )}
        <span style={{ color: typeof data === 'string' ? '#ce9178' : '#b5cea8' }}>
          {typeof data === 'string' ? `"${highlightText(data)}"` : highlightText(data.toString())}
        </span>
      </div>
    )
  }

  const itemCount = isArray ? data.length : Object.keys(data).length

  return (
    <div>
      <div
        style={{
          marginLeft: `${level * 20}px`,
          padding: '2px 0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: matchesSearch ? '#fff3cd' : 'transparent',
          borderRadius: '2px',
        }}
        onClick={() => onToggle(path)}
      >
        <ActionIcon size={16} variant="subtle" color="gray">
          {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
        </ActionIcon>
        {keyName && (
          <span style={{ color: '#9cdcfe', fontWeight: 500 }}>
            {highlightText(keyName)}
            <span style={{ color: '#d4d4d4' }}>: </span>
          </span>
        )}
        <span style={{ color: '#569cd6' }}>
          {isArray ? '[' : '{'}
        </span>
        {!isExpanded && (
          <span style={{ color: '#808080', marginLeft: '4px' }}>
            {itemCount} {isArray ? 'items' : 'keys'}...
          </span>
        )}
      </div>
      
      {isExpanded && (
        <div>
          {Object.entries(data).map(([key, value], index) => {
            // 确保路径构建的一致性，特别是对于数组索引
            const childPath = isArray ? `${path}[${key}]` : `${path}.${key}`
            return (
              <JsonNode
                key={childPath}
                data={value}
                keyName={isArray ? undefined : key}
                searchTerm={searchTerm}
                level={level + 1}
                expanded={expanded}
                onToggle={onToggle}
                path={childPath}
              />
            )
          })}
          <div style={{ marginLeft: `${level * 20}px` }}>
            <span style={{ color: '#569cd6' }}>{isArray ? ']' : '}'}</span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * JSON 数据查看器组件
 */
const JsonDataViewer: React.FC<JsonDataViewerProps> = ({
  opened,
  onClose,
  data,
  loading,
  error,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'revenue' | 'cost' | 'construction' | 'loan' | 'detailed'>('revenue')

  // 默认展开第一层
  React.useEffect(() => {
    if (data && !loading && !error) {
      const defaultExpanded = new Set<string>()
      if (data.revenueTable) {
        defaultExpanded.add('revenueTable')
      }
      if (data.costTable) {
        defaultExpanded.add('costTable')
      }
      if (data.constructionInterest) {
        defaultExpanded.add('constructionInterest')
      }
      if (data.loanRepaymentTable) {
        defaultExpanded.add('loanRepaymentTable')
      }
      if (data.loanRepaymentScheduleDetailed) {
        defaultExpanded.add('loanRepaymentScheduleDetailed')
      }
      setExpanded(defaultExpanded)
    }
  }, [data, loading, error])

  // 处理节点展开/折叠
  const handleToggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  // 全部展开
  const handleExpandAll = () => {
    if (!data) return
    
    const expandAllPaths = (obj: any, prefix: string = ''): Set<string> => {
      const paths = new Set<string>()
      const traverse = (item: any, path: string) => {
        if (typeof item === 'object' && item !== null) {
          paths.add(path)
          Object.entries(item).forEach(([key, value]) => {
            traverse(value, `${path}.${key}`)
          })
        }
      }
      traverse(obj, prefix)
      return paths
    }

    const allPaths = new Set<string>()
    if (activeTab === 'revenue' && data.revenueTable) {
      expandAllPaths(data.revenueTable, 'revenueTable').forEach(p => allPaths.add(p))
    } else if (activeTab === 'cost' && data.costTable) {
      expandAllPaths(data.costTable, 'costTable').forEach(p => allPaths.add(p))
    } else if (activeTab === 'construction' && data.constructionInterest) {
      expandAllPaths(data.constructionInterest, 'constructionInterest').forEach(p => allPaths.add(p))
    } else if (activeTab === 'loan' && data.loanRepaymentTable) {
      expandAllPaths(data.loanRepaymentTable, 'loanRepaymentTable').forEach(p => allPaths.add(p))
    } else if (activeTab === 'detailed' && data.loanRepaymentScheduleDetailed) {
      expandAllPaths(data.loanRepaymentScheduleDetailed, 'loanRepaymentScheduleDetailed').forEach(p => allPaths.add(p))
    }
    setExpanded(allPaths)
  }

  // 全部折叠
  const handleCollapseAll = () => {
    const defaultExpanded = new Set<string>()
    if (data && data.revenueTable) {
      defaultExpanded.add('revenueTable')
    }
    if (data && data.costTable) {
      defaultExpanded.add('costTable')
    }
    if (data && data.constructionInterest) {
      defaultExpanded.add('constructionInterest')
    }
    if (data && data.loanRepaymentTable) {
      defaultExpanded.add('loanRepaymentTable')
    }
    if (data && data.loanRepaymentScheduleDetailed) {
      defaultExpanded.add('loanRepaymentScheduleDetailed')
    }
    setExpanded(defaultExpanded)
  }

  // 复制 JSON 数据
  const handleCopy = async () => {
    try {
      // 复制当前标签的数据，如果为空则复制完整数据
      let jsonToCopy: any = data
      
      if (!jsonToCopy) {
        notifications.show({
          title: '错误',
          message: '没有可复制的数据',
          color: 'red',
        })
        return
      }

      const jsonString = JSON.stringify(jsonToCopy, null, 2)
      await navigator.clipboard.writeText(jsonString)
      
      notifications.show({
        title: '复制成功',
        message: '完整项目财务数据已复制到剪贴板',
        color: 'green',
        autoClose: 2000,
      })
    } catch (error) {
      notifications.show({
        title: '复制失败',
        message: '无法复制到剪贴板，请检查浏览器权限',
        color: 'red',
      })
    }
  }

  // 过滤后的数据
  const filteredData = useMemo(() => {
    if (!data) return null
    
    const filterBySearchTerm = (obj: any, term: string): any => {
      if (!term) return obj
      
      try {
        const objStr = JSON.stringify(obj).toLowerCase()
        if (!objStr.includes(term.toLowerCase())) {
          return null
        }
        
        return obj
      } catch (error) {
        return obj // 出错时返回原对象
      }
    }

    return {
      revenueTable: filterBySearchTerm(data.revenueTable, searchTerm),
      costTable: filterBySearchTerm(data.costTable, searchTerm),
      constructionInterest: filterBySearchTerm(data.constructionInterest, searchTerm),
      loanRepaymentTable: filterBySearchTerm(data.loanRepaymentTable, searchTerm),
      loanRepaymentScheduleDetailed: filterBySearchTerm(data.loanRepaymentScheduleDetailed, searchTerm),
    }
  }, [data, searchTerm])

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="90vw"
      centered
      styles={{
        body: {
          height: '85vh',
          padding: 0,
        },
        content: {
          maxWidth: '1400px',
        },
      }}
      title={
        <Group justify="space-between" w="100%">
          <Text size="md" fw={600}>📊 JSON 数据查看器</Text>
          <ActionIcon variant="subtle" onClick={onClose}>
            <IconX size={20} />
          </ActionIcon>
        </Group>
      }
    >
      <LoadingOverlay visible={loading} />
      
      {error && (
        <Alert color="red" style={{ margin: '16px' }}>
          <Group justify="space-between">
            <Text>{error}</Text>
            <Button size="xs" onClick={() => window.location.reload()}>
              重试
            </Button>
          </Group>
        </Alert>
      )}

      {!loading && !error && (
        <Stack h="100%">
          {/* 工具栏 */}
          <Box p="md" style={{ borderBottom: '1px solid #e9ecef' }}>
            <Group justify="space-between">
              <Group>
                <TextInput
                  placeholder="搜索关键字..."
                  leftSection={<IconSearch size={16} />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '300px' }}
                />
              </Group>
              <Group gap="xs">
                <Button size="xs" variant="light" onClick={handleExpandAll}>
                  全部展开
                </Button>
                <Button size="xs" variant="light" onClick={handleCollapseAll}>
                  全部折叠
                </Button>
                <ActionIcon variant="light" color="blue" onClick={handleCopy}>
                  <IconCopy size={18} />
                </ActionIcon>
              </Group>
            </Group>
          </Box>

          {/* 标签页 */}
          <Tabs value={activeTab} onChange={(v) => setActiveTab(v as any)} p="md">
            <Tabs.List>
              <Tabs.Tab value="revenue">营业收入、营业税金及附加和增值税估算表</Tabs.Tab>
              <Tabs.Tab value="cost">总成本费用估算表</Tabs.Tab>
              <Tabs.Tab value="construction">建设期利息详情</Tabs.Tab>
              <Tabs.Tab value="loan">还本付息计划简表</Tabs.Tab>
              <Tabs.Tab value="detailed">还本付息计划表（等额本息）</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="revenue">
              {filteredData?.revenueTable ? (
                <ScrollArea h="calc(85vh - 180px)" offsetScrollbars>
                  <Box p="md" style={{ backgroundColor: '#1e1e1e', borderRadius: '8px', color: '#d4d4d4', fontFamily: 'Consolas, Monaco, monospace', fontSize: '13px' }}>
                    <JsonNode
                      data={filteredData.revenueTable}
                      searchTerm={searchTerm}
                      level={0}
                      expanded={expanded}
                      onToggle={handleToggle}
                      path="revenueTable"
                    />
                  </Box>
                </ScrollArea>
              ) : (
                <Box p="xl" style={{ textAlign: 'center', color: '#86909C' }}>
                  <Text>暂无营业收入表数据</Text>
                </Box>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="cost">
              {filteredData?.costTable ? (
                <ScrollArea h="calc(85vh - 180px)" offsetScrollbars>
                  <Box p="md" style={{ backgroundColor: '#1e1e1e', borderRadius: '8px', color: '#d4d4d4', fontFamily: 'Consolas, Monaco, monospace', fontSize: '13px' }}>
                    <JsonNode
                      data={filteredData.costTable}
                      searchTerm={searchTerm}
                      level={0}
                      expanded={expanded}
                      onToggle={handleToggle}
                      path="costTable"
                    />
                  </Box>
                </ScrollArea>
              ) : (
                <Box p="xl" style={{ textAlign: 'center', color: '#86909C' }}>
                  <Text>暂无总成本费用表数据</Text>
                </Box>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="construction">
              {filteredData?.constructionInterest ? (
                <ScrollArea h="calc(85vh - 180px)" offsetScrollbars>
                  <Box p="md" style={{ backgroundColor: '#1e1e1e', borderRadius: '8px', color: '#d4d4d4', fontFamily: 'Consolas, Monaco, monospace', fontSize: '13px' }}>
                    <JsonNode
                      data={filteredData.constructionInterest}
                      searchTerm={searchTerm}
                      level={0}
                      expanded={expanded}
                      onToggle={handleToggle}
                      path="constructionInterest"
                    />
                  </Box>
                </ScrollArea>
              ) : (
                <Box p="xl" style={{ textAlign: 'center', color: '#86909C' }}>
                  <Text>暂无建设期利息详情数据</Text>
                </Box>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="loan">
              {filteredData?.loanRepaymentTable ? (
                <ScrollArea h="calc(85vh - 180px)" offsetScrollbars>
                  <Box p="md" style={{ backgroundColor: '#1e1e1e', borderRadius: '8px', color: '#d4d4d4', fontFamily: 'Consolas, Monaco, monospace', fontSize: '13px' }}>
                    <JsonNode
                      data={filteredData.loanRepaymentTable}
                      searchTerm={searchTerm}
                      level={0}
                      expanded={expanded}
                      onToggle={handleToggle}
                      path="loanRepaymentTable"
                    />
                  </Box>
                </ScrollArea>
              ) : (
                <Box p="xl" style={{ textAlign: 'center', color: '#86909C' }}>
                  <Text>暂无还本付息计划简表数据</Text>
                </Box>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="detailed">
              {filteredData?.loanRepaymentScheduleDetailed ? (
                <ScrollArea h="calc(85vh - 180px)" offsetScrollbars>
                  <Box p="md" style={{ backgroundColor: '#1e1e1e', borderRadius: '8px', color: '#d4d4d4', fontFamily: 'Consolas, Monaco, monospace', fontSize: '13px' }}>
                    <JsonNode
                      data={filteredData.loanRepaymentScheduleDetailed}
                      searchTerm={searchTerm}
                      level={0}
                      expanded={expanded}
                      onToggle={handleToggle}
                      path="loanRepaymentScheduleDetailed"
                    />
                  </Box>
                </ScrollArea>
              ) : (
                <Box p="xl" style={{ textAlign: 'center', color: '#86909C' }}>
                  <Text>暂无还本付息计划表（等额本息）数据</Text>
                </Box>
              )}
            </Tabs.Panel>
          </Tabs>
        </Stack>
      )}
    </Modal>
  )
}

export default JsonDataViewer
