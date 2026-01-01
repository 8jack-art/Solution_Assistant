import React, { useState } from 'react'
import { Container, Paper, Title, Tabs, Box } from '@mantine/core'


import CKEditor5Input from '@/components/report/CKEditor5Input'
import CKEditor5Output from '@/components/report/CKEditor5Output'
import TiptapInput from '@/components/report/TiptapInput'
import RichTextOutput from '@/components/report/RichTextOutput'
import TestTiptap from '@/components/report/TestTiptap'
import TestTiptap2 from '@/components/report/TestTiptap2'
import SimpleHTMLInput from '@/components/report/SimpleHTMLInput'

const RichTextEditorTest: React.FC = (): React.ReactNode => {
  const [activeTab, setActiveTab] = useState('0')
  const [ckeditorContent, setCkeditorContent] = useState('<p>Hello CKEditor5!</p>')
  const [tiptapContent, setTiptapContent] = useState('<p>Hello Tiptap!</p>')
  const [simpleHtmlContent, setSimpleHtmlContent] = useState('<p>Hello Simple HTML!</p>')
  const [testTiptapContent, setTestTiptapContent] = useState('<p>Hello Test Tiptap!</p>')
  const [testTiptap2Content, setTestTiptap2Content] = useState('<p>Hello Test Tiptap 2!</p>')

  const handleTabChange = (value: string | null) => {
    if (value) {
      setActiveTab(value)
    }
  }

  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="xl">富文本编辑器测试页面</Title>
      
      <Paper shadow="sm" p="md" mb="lg">
        <Tabs value={activeTab} onChange={handleTabChange} variant="pills">
          <Tabs.List>
            <Tabs.Tab value="0">CKEditor5</Tabs.Tab>
            <Tabs.Tab value="1">Tiptap</Tabs.Tab>
            <Tabs.Tab value="2">测试组件</Tabs.Tab>
            <Tabs.Tab value="3">简单HTML输入</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="0">
            <Box mt="md">
              <Title order={4} mb="sm">CKEditor5 编辑器</Title>
              <CKEditor5Input 
                value={ckeditorContent} 
                onChange={setCkeditorContent} 
              />
              <Box className="h-6" />
              <Title order={4} mb="sm">CKEditor5 输出</Title>
              <CKEditor5Output content={ckeditorContent} isGenerating={false} />
            </Box>
          </Tabs.Panel>
          
          <Tabs.Panel value="1">
            <Box mt="md">
              <Title order={4} mb="sm">Tiptap 编辑器</Title>
              <TiptapInput 
                value={tiptapContent} 
                onChange={setTiptapContent} 
              />
              <Box className="h-6" />
              <Title order={4} mb="sm">Tiptap 输出</Title>
              <RichTextOutput content={tiptapContent} isGenerating={false} />
            </Box>
          </Tabs.Panel>
          
          <Tabs.Panel value="2">
            <Box mt="md">
              <Title order={4} mb="sm">TestTiptap</Title>
              <TestTiptap 
                value={testTiptapContent} 
                onChange={setTestTiptapContent} 
              />
              <Box className="h-6" />
              <Title order={4} mb="sm">TestTiptap2</Title>
              <TestTiptap2 
                value={testTiptap2Content} 
                onChange={setTestTiptap2Content} 
              />
            </Box>
          </Tabs.Panel>
          
          <Tabs.Panel value="3">
            <Box mt="md">
              <Title order={4} mb="sm">Simple HTML 编辑器</Title>
              <SimpleHTMLInput 
                value={simpleHtmlContent} 
                onChange={setSimpleHtmlContent} 
              />
              <Box className="h-6" />
              <Title order={4} mb="sm">HTML 输出</Title>
              <RichTextOutput content={simpleHtmlContent} isGenerating={false} />
            </Box>
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Container>
  )
}

export default RichTextEditorTest
